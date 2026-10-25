import "server-only";
import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";

// Mercado Pago (Checkout Pro: Pix e cartão). Variáveis na Vercel:
//   MERCADOPAGO_ACCESS_TOKEN    Suas integrações > aplicação > Credenciais de produção (APP_USR-...)
//   MERCADOPAGO_WEBHOOK_SECRET  Suas integrações > aplicação > Webhooks > assinatura secreta
//   MERCADOPAGO_API             só para testes locais (padrão https://api.mercadopago.com)
const API = process.env.MERCADOPAGO_API ?? "https://api.mercadopago.com";

export const pagamentoOnlineAtivo = () =>
  Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN && process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL);

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
  payer: { name: string; email: string };
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

export function buscarPagamento(id: string) {
  return chamar<{ id: number; status: string; status_detail?: string; external_reference?: string; transaction_amount?: number; currency_id?: string }>(
    `/v1/payments/${encodeURIComponent(id)}`,
  );
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
