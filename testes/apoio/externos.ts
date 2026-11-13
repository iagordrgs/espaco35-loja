// Serviços de FORA da loja, simulados: Mercado Pago, Resend (e-mail), ViaCEP e Melhor Envio.
// Tudo o mais (banco, regras do banco, regras do site) roda de verdade. O fetch passa direto para o Supabase local.

export type PagamentoFalso = {
  id: number;
  status: string;
  status_detail?: string;
  external_reference?: string;
  transaction_amount?: number;
  currency_id?: string;
  date_last_updated?: string;
};

export const mp = {
  pagamentos: new Map<string, PagamentoFalso>(),
  preferencias: [] as { corpo: Record<string, unknown>; idempotencia: string | null }[],
  cancelados: [] as string[],
  falharPreferencia: false,
  chamadas: 0, // toda requisição ao "Mercado Pago", inclusive as recusadas
  fora: false, // API inteira fora do ar
  proximoId: 900_000_001,
};

export const email = {
  enviados: [] as { assunto: string; html: string; para: string[] }[],
  falhar: false,
};

// CEPs conhecidos pelo "ViaCEP" de mentira
export const ceps: Record<string, { logradouro: string; bairro: string; localidade: string; uf: string }> = {
  "60060000": { logradouro: "Rua Floriano Peixoto", bairro: "Centro", localidade: "Fortaleza", uf: "CE" },
  "01310100": { logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" },
};

export const melhorEnvio = { opcoes: [{ id: 1, name: "PAC", price: "32.50", delivery_time: 7, company: { name: "Correios" } }] };

export function zerarExternos() {
  mp.pagamentos.clear();
  mp.preferencias.length = 0;
  mp.cancelados.length = 0;
  mp.falharPreferencia = false;
  mp.chamadas = 0;
  mp.fora = false;
  email.enviados.length = 0;
  email.falhar = false;
}

// Cria um pagamento no "Mercado Pago" e devolve o id (string, como chega nos avisos).
export function novoPagamento(dados: Omit<PagamentoFalso, "id"> & { id?: number }): string {
  const id = dados.id ?? mp.proximoId++;
  mp.pagamentos.set(String(id), { currency_id: "BRL", date_last_updated: new Date().toISOString(), ...dados, id });
  return String(id);
}

const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

export function instalarFetch(urlSupabase: string) {
  const fetchReal = globalThis.fetch;
  const supabase = new URL(urlSupabase).host;
  globalThis.fetch = async (entrada: RequestInfo | URL, init?: RequestInit) => {
    const pedido = new Request(entrada, init);
    const url = new URL(pedido.url);
    if (url.host === supabase) return fetchReal(entrada, init);

    if (url.host === "mp.teste") {
      mp.chamadas++;
      if (mp.fora) return json({ message: "fora do ar" }, 503);
      if (url.pathname === "/checkout/preferences" && pedido.method === "POST") {
        if (mp.falharPreferencia) return json({ message: "erro" }, 500);
        const corpo = (await pedido.json()) as Record<string, unknown>;
        // como o de verdade: item com preço zero ou negativo é recusado
        if ((corpo.items as { unit_price: number }[]).some((i) => !(i.unit_price > 0))) return json({ message: "unit_price invalid" }, 400);
        mp.preferencias.push({ corpo, idempotencia: pedido.headers.get("X-Idempotency-Key") });
        const n = mp.preferencias.length;
        return json({ id: `pref-${n}`, init_point: `https://mp.teste/pagar/${n}` });
      }
      if (url.pathname === "/v1/payments/search") {
        const lista = [...mp.pagamentos.values()].sort((a, b) => String(b.date_last_updated).localeCompare(String(a.date_last_updated)));
        return json({ paging: { total: lista.length }, results: lista });
      }
      const m = url.pathname.match(/^\/v1\/payments\/(\d+)$/);
      if (m) {
        const pagamento = mp.pagamentos.get(m[1]);
        if (!pagamento) return json({ message: "not found" }, 404);
        if (pedido.method === "PUT") {
          mp.cancelados.push(m[1]);
          pagamento.status = "cancelled";
        }
        return json(pagamento);
      }
      return json({ message: "rota não simulada" }, 404);
    }

    if (url.host === "email.teste") {
      if (email.falhar) return json({ message: "erro" }, 500);
      const corpo = (await pedido.json()) as { subject: string; html: string; to: string[] };
      email.enviados.push({ assunto: corpo.subject, html: corpo.html, para: corpo.to });
      return json({ id: `email-${email.enviados.length}` });
    }

    if (url.host === "viacep.com.br") {
      const cep = url.pathname.split("/")[2];
      return json(ceps[cep] ?? { erro: true });
    }

    if (url.host === "me.teste") return json(melhorEnvio.opcoes);

    throw new Error(`[testes] chamada para fora não simulada: ${pedido.method} ${pedido.url}`);
  };
}
