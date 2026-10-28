import { createHash } from "node:crypto";
import { revalidateTag } from "next/cache";
import { getProduct } from "@/data/products";
import { TAG_ESTOQUE } from "@/lib/estoque";
import { cotarFrete, soDigitos } from "@/lib/frete";
import { criarPreferencia, pagamentoOnlineAtivo } from "@/lib/mercadopago";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

const RESERVA_MINUTOS = 30;
const MAX_PARES = 5; // mais que isso no site vira conversa com a equipe (e o atacado é pelo WhatsApp)
const MAX_RESERVAS_POR_IP = 2; // freia quem tenta travar o estoque criando pedidos sem pagar

// Só o hash do IP vai para o banco, nunca o IP em si.
function hashIp(request: Request) {
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "sem-ip";
  return createHash("sha256").update(`${ip}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`).digest("hex").slice(0, 32);
}
const texto = (v: unknown, max = 120) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const erro = (mensagem: string, status = 400) => Response.json({ erro: mensagem }, { status });

// POST { slugs, cliente: {nome, email, telefone}, endereco: {cep, numero, complemento, rua, bairro}, freteId }
// Cria o pedido e devolve o link de pagamento do Mercado Pago. Os pares NÃO ficam reservados aqui: continuam à venda
// até o Mercado Pago avisar que a cliente gerou o Pix ou enviou o cartão (webhook -> reservar_pedido). O pedido vale 30 min.
// Preço e frete são sempre recalculados aqui: nada do que vem do navegador define valor.
export async function POST(request: Request) {
  const admin = supabaseAdmin();
  if (!pagamentoOnlineAtivo() || !admin) return erro("Pagamento online ainda não está ativo. Finalize pelo WhatsApp.", 503);

  const corpo = await request.json().catch(() => null);
  const slugs: string[] = [...new Set<string>(Array.isArray(corpo?.slugs) ? corpo.slugs.filter((s: unknown) => typeof s === "string") : [])];
  if (slugs.length > MAX_PARES) return erro(`Pelo site dá para pagar até ${MAX_PARES} pares por pedido. Para mais, finalize pelo WhatsApp.`);
  const pares = slugs.map((s) => getProduct(s)).filter((p) => p !== undefined);
  if (pares.length === 0 || pares.length !== slugs.length) return erro("Sua sacola mudou. Volte à sacola e confira os pares.");

  const nome = texto(corpo?.cliente?.nome);
  const email = texto(corpo?.cliente?.email);
  const telefone = texto(corpo?.cliente?.telefone, 30);
  const numero = texto(corpo?.endereco?.numero, 20);
  const complemento = texto(corpo?.endereco?.complemento, 80);
  if (nome.length < 3) return erro("Informe seu nome completo.");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return erro("Informe um e-mail válido.");
  if (telefone.replace(/\D/g, "").length < 10) return erro("Informe seu WhatsApp com DDD.");
  if (!numero) return erro("Informe o número do endereço.");
  if (complemento.length < 2) return erro("Informe o complemento (apartamento e bloco, ou casa).");

  // Limites contra quem quer travar o estoque sem pagar: no máximo 2 reservas abertas por aparelho/rede.
  // A mesma cliente (e-mail ou WhatsApp) tentando de novo: a reserva anterior é cancelada e os pares voltam.
  const ipHash = hashIp(request);
  await admin.rpc("cancelar_expirados");
  const { data: abertos } = await admin.from("pedidos").select("id,cliente_email,cliente_telefone,cliente_ip_hash")
    .eq("origem", "site").eq("status", "novo").gt("expira_em", new Date().toISOString());
  const digitos = telefone.replace(/\D/g, "");
  // Pedido anterior deste mesmo navegador (o código público é secreto: quem tem, abriu o pedido).
  const substituir = texto(corpo?.substituir, 40);
  if (/^[0-9a-f-]{36}$/i.test(substituir)) {
    const { data: anterior } = await admin.from("pedidos").select("id").eq("codigo_publico", substituir).eq("origem", "site").eq("status", "novo").maybeSingle();
    if (anterior) await admin.rpc("cancelar_pedido_site", { pedido: anterior.id, situacao: "substituido" });
  }
  for (const p of abertos ?? []) {
    if (p.cliente_email?.toLowerCase() === email.toLowerCase() || (p.cliente_telefone ?? "").replace(/\D/g, "") === digitos) {
      await admin.rpc("cancelar_pedido_site", { pedido: p.id, situacao: "substituido" });
    }
  }
  const doMesmoIp = (abertos ?? []).filter((p) => p.cliente_ip_hash === ipHash && p.cliente_email?.toLowerCase() !== email.toLowerCase()).length;
  if (doMesmoIp >= MAX_RESERVAS_POR_IP) return erro("Já existem pedidos aguardando pagamento a partir desta conexão. Conclua um deles ou fale com a equipe pelo WhatsApp.", 429);

  const cotacao = await cotarFrete(soDigitos(texto(corpo?.endereco?.cep, 12)), pares.map((p) => p.price ?? 0));
  if (!cotacao.endereco) return erro(cotacao.aviso ?? "CEP inválido.");
  const frete = cotacao.opcoes.find((o) => o.id === texto(corpo?.freteId, 40));
  if (!frete) return erro("Escolha uma opção de entrega.");

  const endereco = {
    cep: cotacao.endereco.cep,
    rua: texto(corpo?.endereco?.rua) || cotacao.endereco.rua,
    numero,
    complemento,
    bairro: texto(corpo?.endereco?.bairro, 80) || cotacao.endereco.bairro,
    cidade: cotacao.endereco.cidade,
    uf: cotacao.endereco.uf,
  };
  const itens = pares.map((p) => ({ slug: p.slug, nome: p.name, codigo: p.code, categoria: p.category, preco: p.price ?? 0, tabela: "varejo" }));
  const subtotal = Math.round(itens.reduce((s, i) => s + i.preco, 0) * 100) / 100;

  const { data: idPedido, error } = await admin.rpc("criar_pedido", {
    dados: {
      status: "novo",
      origem: "site",
      reservar_minutos: RESERVA_MINUTOS,
      sem_reserva: true,
      cliente_nome: nome,
      cliente_email: email,
      cliente_telefone: telefone,
      cliente_cidade: `${endereco.cidade} - ${endereco.uf}`,
      endereco,
      itens,
      subtotal,
      frete: frete.preco,
      total: Math.round((subtotal + frete.preco) * 100) / 100,
      pagamento: "Mercado Pago (Pix ou cartão)",
      entrega: `${frete.nome} · ${frete.prazo}`,
      vendedor: "Site",
      cliente_ip_hash: ipHash,
    },
  });
  if (error) {
    return erro(error.message.startsWith("Par indisponível") ? "Um dos pares acabou de ser reservado por outra cliente. Volte à sacola e confira." : "Não foi possível criar o pedido agora. Tente de novo ou finalize pelo WhatsApp.", 409);
  }

  const { data: pedido } = await admin.from("pedidos").select("codigo_publico").eq("id", idPedido).single();
  const voltar = `${SITE_URL}/pedido/${pedido?.codigo_publico}`;

  try {
    const preferencia = await criarPreferencia({
      idempotencia: `pedido-${idPedido}`,
      external_reference: String(idPedido),
      payer: { name: nome, email },
      items: [
        ...pares.map((p) => ({
          id: p.slug,
          title: `${p.name} · tam. 35`,
          quantity: 1,
          unit_price: p.price ?? 0,
          currency_id: "BRL" as const,
          picture_url: `${SITE_URL}${p.images[0]}`,
        })),
        { id: "frete", title: `Frete · ${frete.nome}`, quantity: 1, unit_price: frete.preco, currency_id: "BRL" as const },
      ],
      back_urls: { success: voltar, pending: voltar, failure: voltar },
      notification_url: `${SITE_URL}/api/mercadopago/webhook`,
      expiration_date_to: new Date(Date.now() + RESERVA_MINUTOS * 60_000).toISOString(),
    });
    revalidateTag(TAG_ESTOQUE, { expire: 0 }); // um pedido anterior desta cliente pode ter liberado pares
    const usarSandbox = process.env.MERCADOPAGO_SANDBOX === "1" && preferencia.sandbox_init_point;
    return Response.json({ url: usarSandbox ? preferencia.sandbox_init_point : preferencia.init_point, codigo: pedido?.codigo_publico });
  } catch {
    await admin.rpc("cancelar_pedido_site", { pedido: idPedido, situacao: "erro_checkout" });
    return erro("O pagamento não abriu agora. Tente de novo em instantes ou finalize pelo WhatsApp.", 502);
  }
}
