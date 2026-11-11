import { buscarPagamento, pagamentoOnlineAtivo } from "@/lib/mercadopago";
import { PAGOS, mensagemDe, processarPagamento, registrar } from "@/lib/pagamentos";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Volta da cliente do Mercado Pago (back_urls do checkout e do link do painel). Antes de mostrar o pedido, consulta
// na API o pagamento indicado no endereço e aplica a mesma regra do aviso: se o aviso atrasar ou falhar, o pagamento
// aprovado já fica registrado aqui. O endereço pode ser editado por qualquer um: só vale o pagamento que a API do
// Mercado Pago devolve para a conta da loja e que pertence a este pedido.
export async function GET(request: Request, { params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params;
  const url = new URL(request.url);
  const destino = new URL(`/pedido/${encodeURIComponent(codigo)}`, url);
  for (const chave of ["status", "collection_status"]) {
    const valor = url.searchParams.get(chave);
    if (valor) destino.searchParams.set(chave, valor);
  }

  const idPagamento = url.searchParams.get("payment_id") ?? url.searchParams.get("collection_id") ?? "";
  const admin = supabaseAdmin();
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(codigo);
  if (admin && pagamentoOnlineAtivo() && uuid && /^\d{1,20}$/.test(idPagamento)) {
    try {
      const { data: pedido, error } = await admin
        .from("pedidos")
        .select("id,status,pagamento_id,pagamento_status")
        .eq("codigo_publico", codigo)
        .maybeSingle();
      if (error) throw error;
      const jaRegistrado =
        pedido && (PAGOS.includes(pedido.status) || (pedido.pagamento_id === idPagamento && ["approved", "valor_divergente"].includes(pedido.pagamento_status ?? "")));
      if (pedido && !jaRegistrado) {
        const pagamento = await buscarPagamento(idPagamento);
        if (Number(pagamento.external_reference) === pedido.id) await processarPagamento(admin, pagamento, "retorno");
        else registrar("aviso", "volta com pagamento de outro pedido", { pedido: pedido.id, pagamento: idPagamento });
      }
    } catch (erro) {
      // a cliente segue para a página do pedido de qualquer jeito; o aviso e a conferência diária ainda registram
      registrar("erro", "volta da cliente sem conferir o pagamento", { pagamento: idPagamento, erro: mensagemDe(erro) });
    }
  }
  return Response.redirect(destino, 303);
}
