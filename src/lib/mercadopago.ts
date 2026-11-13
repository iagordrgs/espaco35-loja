import "server-only";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";

// Mercado Pago (Checkout Pro: Pix e cartão). Usado pelo checkout do site e pelo link de pagamento do painel. Variáveis na Vercel:
//   MERCADOPAGO_ACCESS_TOKEN    Suas integrações > aplicação > Credenciais de produção (APP_USR-...)
//   MERCADOPAGO_WEBHOOK_SECRET  Suas integrações > aplicação > Webhooks > assinatura secreta
//   CRON_SECRET                 texto aleatório longo: só a Vercel Cron chama a conferência diária (src/lib/pagamentos.ts)
//   MERCADOPAGO_API             só para testes locais (padrão https://api.mercadopago.com)
const API = process.env.MERCADOPAGO_API ?? "https://api.mercadopago.com";

// Só liga com TUDO cadastrado: sem a assinatura do webhook, uma cliente pagaria e o pedido nunca viraria "Pago".
export const pagamentoOnlineAtivo = () =>
  Boolean(
    process.env.MERCADOPAGO_ACCESS_TOKEN &&
      process.env.MERCADOPAGO_WEBHOOK_SECRET &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      process.env.NEXT_PUBLIC_SUPABASE_URL,
  );

async function chamar<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  const resposta = await fetch(`${API}${caminho}`, {
    ...init,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!resposta.ok) throw new Error(`Mercado Pago respondeu ${resposta.status}: ${(await resposta.text()).slice(0, 300)}`);
  return resposta.json() as Promise<T>;
}

export type ItemPreferencia = { id: string; title: string; quantity: number; unit_price: number; currency_id: "BRL"; picture_url?: string };

export function criarPreferencia(corpo: {
  items: ItemPreferencia[];
  payer: { name: string; email?: string };
  external_reference: string;
  back_urls: { success: string; pending: string; failure: string };
  notification_url: string;
  expiration_date_to: string;
  idempotencia: string;
}) {
  const { idempotencia, ...body } = corpo;
  return chamar<{ id: string; init_point: string; sandbox_init_point?: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": idempotencia },
    body: JSON.stringify({
      ...body,
      auto_return: "approved",
      expires: true,
      expiration_date_from: new Date().toISOString(),
      date_of_expiration: body.expiration_date_to, // Pix/boleto vencem junto com a reserva dos pares
      statement_descriptor: "ESPACO35",
      // sem boleto/lotérica: compensam em 1 a 3 dias, depois da reserva de 30 min (o par poderia ter ido para outra cliente)
      payment_methods: { installments: 6, excluded_payment_types: [{ id: "ticket" }, { id: "atm" }] },
    }),
  });
}

export type Pagamento = {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  transaction_amount_refunded?: number;
  currency_id?: string;
};

export function buscarPagamento(id: string) {
  return chamar<Pagamento>(`/v1/payments/${encodeURIComponent(id)}`);
}

// Pagamentos que mudaram de situação entre duas datas (aprovados, estornados...), do mais recente para o mais antigo.
// Usado pela conferência diária: pega o que o aviso do Mercado Pago não conseguiu registrar.
export function buscarPagamentosAlterados(desde: Date, ate: Date, offset = 0) {
  const filtro = new URLSearchParams({
    range: "date_last_updated",
    begin_date: desde.toISOString(),
    end_date: ate.toISOString(),
    sort: "date_last_updated",
    criteria: "desc",
    limit: "100",
    offset: String(offset),
  });
  return chamar<{ paging?: { total?: number }; results?: Pagamento[] }>(`/v1/payments/search?${filtro}`);
}

// Cancela um pagamento ainda pendente (Pix gerado e não pago): usado quando outra cliente levou o par antes.
export function cancelarPagamento(id: string) {
  return chamar<{ id: number; status: string }>(`/v1/payments/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

// Confere se o aviso veio mesmo do Mercado Pago (assinatura HMAC no cabeçalho x-signature), pelo SDK oficial.
export function assinaturaValida(xSignature: string | null, xRequestId: string | null, dataId: string | null): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret) return false;
  try {
    // Sem checagem de horário: o SDK supõe o `ts` em segundos, e um aviso legítimo com `ts` em milissegundos
    // seria recusado. Repetir um aviso não faz mal: o pagamento é sempre consultado de novo na API.
    WebhookSignatureValidator.validate({ xSignature, xRequestId, dataId, secret });
    return true;
  } catch (erro) {
    if (erro instanceof InvalidWebhookSignatureError) return false;
    throw erro;
  }
}
