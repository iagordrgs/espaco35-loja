"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { ATACADO_MINIMO, getProduct } from "@/data/products";
import { PRECO_ATACADO } from "@/lib/atacado";
import { TAG_ESTOQUE } from "@/lib/estoque";
import { criarPreferencia, pagamentoOnlineAtivo } from "@/lib/mercadopago";
import { SITE_URL } from "@/lib/site";
import { estaNaEquipe, exigirUsuario, supabaseServidor } from "@/lib/supabase/server";
import { RESERVA_PAINEL_HORAS, STATUS_PEDIDO, type Pedido, type StatusPedido } from "@/lib/painel";

export type EstadoForm = { erro?: string };

const texto = (form: FormData, campo: string) => String(form.get(campo) ?? "").trim();
const dinheiro = (form: FormData, campo: string) => {
  const valor = Number(texto(form, campo).replace(/\./g, "").replace(",", ".") || 0);
  return Number.isFinite(valor) && valor >= 0 ? Math.round(valor * 100) / 100 : 0;
};

// O site e o painel passam a mostrar a situação nova na próxima visita.
function atualizarTelas() {
  updateTag(TAG_ESTOQUE);
  revalidatePath("/painel", "layout");
}

export async function entrar(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const supabase = await supabaseServidor();
  const { error } = await supabase.auth.signInWithPassword({
    email: texto(form, "email"),
    password: String(form.get("senha") ?? ""),
  });
  if (error) return { erro: "E-mail ou senha incorretos." };
  const { data } = await supabase.auth.getUser();
  if (!data.user || !(await estaNaEquipe(supabase, data.user.id))) {
    await supabase.auth.signOut();
    return { erro: "Este usuário não tem acesso ao painel. Peça para a loja incluir você na equipe." };
  }
  redirect("/painel");
}

export async function sair() {
  const supabase = await supabaseServidor();
  await supabase.auth.signOut();
  redirect("/painel/login");
}

export async function definirEstoque(form: FormData) {
  const { supabase } = await exigirUsuario();
  const slug = texto(form, "slug");
  const status = texto(form, "status");
  const horas = Number(texto(form, "horas")) || null;
  if (!getProduct(slug)) return;
  const { error } = await supabase.rpc("definir_estoque", { par: slug, novo_status: status, horas });
  if (error) throw new Error(error.message);
  atualizarTelas();
}

export async function criarPedido(_estado: EstadoForm, form: FormData): Promise<EstadoForm> {
  const { supabase } = await exigirUsuario();

  const slugs = [...new Set(form.getAll("pares").map(String))];
  const pares = slugs.map((slug) => getProduct(slug)).filter((p) => p !== undefined);
  if (pares.length === 0) return { erro: "Escolha pelo menos um par." };
  const cliente = texto(form, "cliente_nome");
  if (!cliente) return { erro: "Informe o nome da cliente." };

  // atacado só a partir do mínimo de pares; preço sempre do catálogo, nunca do formulário
  const atacado = texto(form, "tipo") === "atacado";
  if (atacado && pares.length < ATACADO_MINIMO) return { erro: `Atacado vale a partir de ${ATACADO_MINIMO} pares. Este pedido tem ${pares.length}.` };
  const itens = pares.map((p) => ({
    slug: p.slug,
    nome: p.name,
    codigo: p.code,
    categoria: p.category,
    preco: atacado ? PRECO_ATACADO[p.category] : p.price ?? 0,
    tabela: atacado ? "atacado" : "varejo",
  }));
  const subtotal = itens.reduce((soma, item) => soma + item.preco, 0);
  const desconto = Math.min(dinheiro(form, "desconto"), subtotal);
  const frete = dinheiro(form, "frete");
  const status = texto(form, "status") === "pago" ? "pago" : "novo";

  const { data, error } = await supabase.rpc("criar_pedido", {
    dados: {
      status,
      reservar_minutos: status === "novo" ? RESERVA_PAINEL_HORAS * 60 : undefined, // venda pelo WhatsApp/direct: 24 h, depois o par volta sozinho
      cliente_nome: cliente,
      cliente_telefone: texto(form, "cliente_telefone"),
      cliente_cidade: texto(form, "cliente_cidade"),
      itens,
      subtotal,
      desconto,
      frete,
      total: Math.round((subtotal - desconto + frete) * 100) / 100,
      pagamento: texto(form, "pagamento"),
      entrega: texto(form, "entrega"),
      vendedor: texto(form, "vendedor"),
      observacoes: texto(form, "observacoes"),
    },
  });
  if (error) {
    return { erro: error.message.startsWith("Par indisponível") ? `${error.message}. Atualize a página: alguém já pegou esse par.` : error.message };
  }
  atualizarTelas();
  redirect(`/painel/pedidos/${data}`);
}

// Código de rastreio (ou "Uber Flash", "retirado") do pedido: fica no painel e vai na mensagem para a cliente.
export async function salvarRastreio(form: FormData) {
  const { supabase } = await exigirUsuario();
  const id = Number(texto(form, "id"));
  const rastreio = texto(form, "rastreio").slice(0, 120);
  if (!id) return;
  const { error } = await supabase.from("pedidos").update({ rastreio: rastreio || null, atualizado_em: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/painel", "layout");
}

export async function atualizarPedido(form: FormData) {
  const { supabase } = await exigirUsuario();
  const id = Number(texto(form, "id"));
  const status = texto(form, "status") as StatusPedido;
  if (!id || !STATUS_PEDIDO.includes(status)) return;
  const { error } = await supabase.rpc("atualizar_pedido", { pedido: id, novo_status: status });
  if (error) throw new Error(error.message);
  atualizarTelas();
}

// Link de pagamento do Mercado Pago para venda fechada no WhatsApp ou direct: a cliente paga com Pix ou cartão
// e o aviso do Mercado Pago marca o pedido como pago sozinho (mesmo caminho do checkout do site).
// O link vence junto com a reserva do par (24 h). Só para pedido do painel ainda "novo".
export async function gerarLinkPagamento(form: FormData) {
  const { supabase } = await exigirUsuario();
  const id = Number(texto(form, "id"));
  if (!id) return;
  if (!pagamentoOnlineAtivo()) throw new Error("Pagamento online não está ativo: faltam as credenciais do Mercado Pago na Vercel.");

  await supabase.rpc("cancelar_expirados"); // reserva vencida vira pedido cancelado antes de gerar link
  const { data } = await supabase.from("pedidos").select("*").eq("id", id).maybeSingle();
  const pedido = data as Pedido | null;
  if (!pedido || pedido.status !== "novo" || pedido.origem === "site") {
    redirect(`/painel/pedidos/${id}`);
  }

  const vence = pedido.expira_em && new Date(pedido.expira_em).getTime() > Date.now()
    ? pedido.expira_em
    : new Date(Date.now() + RESERVA_PAINEL_HORAS * 3_600_000).toISOString();
  const comDesconto = Number(pedido.desconto) > 0;
  // Com desconto, o Mercado Pago não aceita valor negativo: vai uma linha só com o total.
  const items = comDesconto
    ? [{ id: `pedido-${pedido.id}`, title: `Pedido #${pedido.id} · ${pedido.itens.length} par(es) tam. 35 + frete`, quantity: 1, unit_price: Number(pedido.total), currency_id: "BRL" as const }]
    : [
        ...pedido.itens.map((i) => ({ id: i.slug, title: `${i.nome} · tam. 35`, quantity: 1, unit_price: Number(i.preco), currency_id: "BRL" as const })),
        ...(Number(pedido.frete) > 0 ? [{ id: "frete", title: `Frete · ${pedido.entrega || "entrega"}`, quantity: 1, unit_price: Number(pedido.frete), currency_id: "BRL" as const }] : []),
      ];
  const voltar = `${SITE_URL}/pedido/${pedido.codigo_publico}`;

  const preferencia = await criarPreferencia({
    idempotencia: `pedido-${pedido.id}-${Date.now()}`,
    external_reference: String(pedido.id),
    payer: { name: pedido.cliente_nome, email: pedido.cliente_email || undefined },
    items,
    back_urls: { success: voltar, pending: voltar, failure: voltar },
    notification_url: `${SITE_URL}/api/mercadopago/webhook`,
    expiration_date_to: vence,
  });
  const usarSandbox = process.env.MERCADOPAGO_SANDBOX === "1" && preferencia.sandbox_init_point;
  const link = usarSandbox ? preferencia.sandbox_init_point! : preferencia.init_point;

  const agora = new Date().toISOString();
  const { error } = await supabase.from("pedidos").update({ link_pagamento: link, pagamento: "Link de pagamento (Mercado Pago)", atualizado_em: agora }).eq("id", id);
  // Banco ainda sem a coluna link_pagamento (schema.sql antigo): guarda só a forma de pagamento; o link vai na tela.
  if (error) await supabase.from("pedidos").update({ pagamento: "Link de pagamento (Mercado Pago)", atualizado_em: agora }).eq("id", id);
  revalidatePath("/painel", "layout");
  redirect(`/painel/pedidos/${id}?link=${encodeURIComponent(link)}`);
}
