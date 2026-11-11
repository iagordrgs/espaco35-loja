import { assinaturaValida, buscarPagamento } from "@/lib/mercadopago";
import { ErroBanco, mensagemDe, processarPagamento, registrar } from "@/lib/pagamentos";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Aviso do Mercado Pago sobre um pagamento. Confere a assinatura, busca o pagamento na API (nunca confia no corpo)
// e aplica a regra de src/lib/pagamentos.ts: aprovado -> pago + e-mail para a equipe; recusado -> cancelado e pares
// de volta ao site. Responde 500 quando o banco ou a API falham: o Mercado Pago repete o aviso a cada 15 minutos.
// Se ainda assim não registrar, a volta da cliente e a conferência diária registram.
export async function POST(request: Request) {
  const url = new URL(request.url);
  const corpo = await request.json().catch(() => ({}));
  const tipo = url.searchParams.get("type") ?? corpo?.type;
  const dataId = url.searchParams.get("data.id") ?? (corpo?.data?.id != null ? String(corpo.data.id) : null);

  if (!assinaturaValida(request.headers.get("x-signature"), request.headers.get("x-request-id"), dataId)) {
    // com a assinatura secreta errada na Vercel, todo aviso cai aqui: a volta da cliente e a conferência seguram
    registrar("aviso", "aviso com assinatura inválida", { tipo, pagamento: dataId });
    return new Response("assinatura inválida", { status: 401 });
  }
  if (tipo !== "payment" || !dataId) return new Response("ok");

  const admin = supabaseAdmin();
  if (!admin) {
    registrar("erro", "aviso sem banco configurado", { pagamento: dataId });
    return new Response("banco não configurado", { status: 500 });
  }

  try {
    await processarPagamento(admin, await buscarPagamento(dataId), "aviso");
    return new Response("ok");
  } catch (erro) {
    // erro definitivo (ex.: pedido que não existe no banco): repetir o aviso não muda nada
    const definitivo = erro instanceof ErroBanco && erro.definitivo;
    registrar("erro", "aviso não registrado", { pagamento: dataId, definitivo, erro: mensagemDe(erro) });
    return definitivo ? new Response("ok") : new Response("erro ao registrar o pagamento", { status: 500 });
  }
}
