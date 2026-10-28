import { revalidatePath, revalidateTag } from "next/cache";
import { avisarEquipe, escapar } from "@/lib/email";
import { TAG_ESTOQUE } from "@/lib/estoque";
import { assinaturaValida, buscarPagamento, cancelarPagamento } from "@/lib/mercadopago";
import { reais, type ItemPedido } from "@/lib/painel";
import { SITE_URL } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Pix gerado ou cartão em análise: é agora que os pares ficam reservados para a cliente (até o pedido vencer).
const PENDENTES = ["pending", "in_process", "authorized"];
// Antes de pagar: cancela o pedido e devolve os pares. Depois de pago: marca "NÃO ENVIAR" e avisa a equipe.
const RECUSADOS = ["rejected", "cancelled"];
const ESTORNOS = ["refunded", "charged_back", "in_mediation"];

// Aviso do Mercado Pago sobre um pagamento. Confere a assinatura, busca o pagamento na API (nunca confia no corpo)
// e atualiza o pedido: aprovado -> pago + e-mail para a equipe; recusado -> cancelado e pares de volta ao site.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const corpo = await request.json().catch(() => ({}));
  const tipo = url.searchParams.get("type") ?? corpo?.type;
  const dataId = url.searchParams.get("data.id") ?? (corpo?.data?.id != null ? String(corpo.data.id) : null);

  if (!assinaturaValida(request.headers.get("x-signature"), request.headers.get("x-request-id"), dataId)) {
    return new Response("assinatura inválida", { status: 401 });
  }
  if (tipo !== "payment" || !dataId) return new Response("ok");

  const admin = supabaseAdmin();
  if (!admin) return new Response("banco não configurado", { status: 500 });

  const pagamento = await buscarPagamento(dataId);
  const idPedido = Number(pagamento.external_reference);
  if (!idPedido) return new Response("ok");

  if (pagamento.status === "approved") {
    // o banco confere se o valor cobre o total do pedido; moeda diferente de real conta como valor inválido
    const valor = pagamento.currency_id === "BRL" ? Number(pagamento.transaction_amount) : null;
    const { data: resultado, error } = await admin.rpc("confirmar_pagamento", { pedido: idPedido, id_pagamento: String(pagamento.id), valor });
    if (error) return new Response("erro ao confirmar", { status: 500 }); // o Mercado Pago tenta de novo
    if (resultado !== "ja_pago") await enviarAviso(idPedido, resultado === "conflito" ? "conferir" : "pago");
  } else if (PENDENTES.includes(pagamento.status)) {
    const { data: reserva } = await admin.rpc("reservar_pedido", { pedido: idPedido });
    if (reserva === "indisponivel") {
      // outra cliente gerou o Pix (ou pagou) antes: cancela este pagamento no Mercado Pago e o pedido
      await cancelarPagamento(String(pagamento.id)).catch(() => undefined);
      await admin.rpc("cancelar_pedido_site", { pedido: idPedido, situacao: "par_indisponivel" });
    } else {
      await admin.from("pedidos").update({ pagamento_status: pagamento.status, pagamento_id: String(pagamento.id) }).eq("id", idPedido).eq("status", "novo");
    }
  } else if (RECUSADOS.includes(pagamento.status)) {
    await admin.rpc("cancelar_pedido_site", { pedido: idPedido, situacao: pagamento.status });
  } else if (ESTORNOS.includes(pagamento.status)) {
    const { data: antes } = await admin.rpc("registrar_estorno", { pedido: idPedido, situacao: pagamento.status });
    if (antes) await enviarAviso(idPedido, "estorno", pagamento.status);
    else if (pagamento.status !== "in_mediation") await admin.rpc("cancelar_pedido_site", { pedido: idPedido, situacao: pagamento.status });
  } else {
    await admin.from("pedidos").update({ pagamento_status: pagamento.status, pagamento_id: String(pagamento.id) }).eq("id", idPedido).eq("status", "novo");
  }

  revalidateTag(TAG_ESTOQUE, { expire: 0 }); // expira já: o par vendido não pode aparecer nem uma vez a mais
  revalidatePath("/painel", "layout");
  return new Response("ok");
}

async function enviarAviso(idPedido: number, tipo: "pago" | "conferir" | "estorno", situacao?: string) {
  const admin = supabaseAdmin();
  const { data: p } = await admin!.from("pedidos").select("*").eq("id", idPedido).single();
  if (!p) return;
  const e = p.endereco ?? {};
  const itens = (p.itens as ItemPedido[]).map((i) => `<li>${escapar(i.nome)} (${escapar(i.codigo)}) · ${reais(i.preco)}</li>`).join("");
  const assunto = {
    pago: `Novo pedido pago #${p.id} · ${p.cliente_nome} · ${reais(p.total)}`,
    conferir: `⚠️ CONFERIR pedido #${p.id} antes de enviar · ${p.cliente_nome}`,
    estorno: `⛔ NÃO ENVIAR pedido #${p.id}: pagamento ${situacao} no Mercado Pago`,
  }[tipo];
  const alerta = {
    pago: "",
    conferir: `<p><strong>Atenção:</strong> ${escapar(p.observacoes)} O pedido não foi marcado como pago.</p>`,
    estorno: `<p><strong>NÃO ENVIAR.</strong> O pagamento ficou "${escapar(situacao)}" no Mercado Pago (estorno, devolução ou disputa). Se já foi enviado, responda a disputa no Mercado Pago com o código de rastreio.</p>`,
  }[tipo];
  await avisarEquipe(
    assunto,
    `<h2>Pedido #${p.id} · ${p.origem === "site" ? "site" : "link de pagamento (venda pela equipe)"}</h2>
     ${alerta}
     <ul>${itens}</ul>
     <p>Frete: ${reais(p.frete)} · ${escapar(p.entrega)}<br><strong>Total: ${reais(p.total)}</strong></p>
     <h3>Enviar para</h3>
     ${p.endereco
       ? `<p>${escapar(p.cliente_nome)}<br>${escapar(e.rua)}, ${escapar(e.numero)}${e.complemento ? ` · ${escapar(e.complemento)}` : ""}<br>
     ${escapar(e.bairro)} · ${escapar(e.cidade)} - ${escapar(e.uf)} · CEP ${escapar(e.cep)}</p>`
       : `<p>${escapar(p.cliente_nome)}${p.cliente_cidade ? ` · ${escapar(p.cliente_cidade)}` : ""}<br>Endereço combinado pela equipe (pedido do painel).</p>`}
     <p>WhatsApp: ${escapar(p.cliente_telefone)} · E-mail: ${escapar(p.cliente_email)}</p>
     <p><a href="${SITE_URL}/painel/pedidos/${p.id}">Abrir no painel</a></p>`,
  );
}
