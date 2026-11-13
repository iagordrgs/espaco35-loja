import { beforeEach, inject, vi } from "vitest";
import { instalarFetch, zerarExternos } from "./externos";
import { sessao } from "./sessao";

// Variáveis de ambiente de teste: banco local e serviços de fora simulados. Nenhuma chave de produção.
const sb = inject("supabase");
for (const nome of Object.keys(process.env)) {
  if (/^(MERCADOPAGO_|RESEND_|MELHORENVIO_|SUPABASE_|NEXT_PUBLIC_SUPABASE_|EMAIL_|CRON_SECRET|LOJA_)/.test(nome)) delete process.env[nome];
}
Object.assign(process.env, {
  NEXT_PUBLIC_SUPABASE_URL: sb.url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: sb.anon,
  SUPABASE_SERVICE_ROLE_KEY: sb.servico,
  MERCADOPAGO_ACCESS_TOKEN: "TEST-token-de-teste",
  MERCADOPAGO_WEBHOOK_SECRET: "segredo-do-webhook-de-teste",
  MERCADOPAGO_API: "http://mp.teste",
  MERCADOPAGO_SANDBOX: "",
  RESEND_API_KEY: "re_teste",
  RESEND_API: "http://email.teste/emails",
  EMAIL_EQUIPE: "equipe@teste.espaco35",
  EMAIL_REMETENTE: "Teste <teste@teste.espaco35>",
  MELHORENVIO_TOKEN: "token-teste",
  MELHORENVIO_API: "http://me.teste",
  LOJA_CEP_ORIGEM: "60060000",
  CRON_SECRET: "segredo-do-cron-de-teste",
});
if (!/^http:\/\/127\.0\.0\.1:/.test(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "")) throw new Error("Banco de teste precisa ser local.");

instalarFetch(sb.url);

// Partes do Next.js que só existem dentro do servidor do Next (não são regra da loja nem serviço de fora):
// o cache de páginas vira um registro de chamadas e os cookies vêm da sessão de teste.
vi.mock("next/cache", () => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
  updateTag: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [...sessao.cookies.entries()].map(([name, value]) => ({ name, value })),
    get: (name: string) => (sessao.cookies.has(name) ? { name, value: sessao.cookies.get(name) } : undefined),
    set: (name: string, value: string) => {
      if (value) sessao.cookies.set(name, value);
      else sessao.cookies.delete(name);
    },
  }),
}));

beforeEach(() => {
  zerarExternos();
  sessao.cookies.clear();
});
