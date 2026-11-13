import { createHmac } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";
import { Client } from "pg";
import { products, type Category, type Product } from "@/data/products";
import { novoPagamento, type PagamentoFalso } from "./externos";
import { sessao } from "./sessao";

// Ferramentas dos testes: chamar as rotas de verdade, preparar o banco e ler o resultado.

const sb = () => inject("supabase");
export const admin = (): SupabaseClient =>
  createClient(sb().url, sb().servico, { auth: { persistSession: false, autoRefreshToken: false } });
export const anonimo = (): SupabaseClient =>
  createClient(sb().url, sb().anon, { auth: { persistSession: false, autoRefreshToken: false } });

// Acesso direto ao Postgres local, só para preparar cenário (ex.: voltar o relógio de um pedido) e limpar.
export async function sql(texto: string, valores: unknown[] = []) {
  const db = new Client({ connectionString: sb().banco });
  await db.connect();
  try {
    return (await db.query(texto, valores)).rows;
  } finally {
    await db.end();
  }
}

export async function limparBanco() {
  await sql("truncate public.pedidos, public.estoque restart identity cascade");
  // só a vendedora de teste fica na equipe: um teste que inclua alguém por engano não contamina os outros
  await sql("delete from public.equipe where user_id not in (select id from auth.users where email = $1)", [EQUIPE]);
}

// Pares do catálogo que o products.ts deixa vender (sem soldOut), na ordem do catálogo.
export function pares(qtd: number, categoria?: Category): Product[] {
  const lista = products.filter((p) => !p.soldOut && p.price && (!categoria || p.category === categoria));
  if (lista.length < qtd) throw new Error(`catálogo sem ${qtd} pares${categoria ? ` de ${categoria}` : ""}`);
  return lista.slice(0, qtd);
}

// ───────────── checkout do site ─────────────
export const CEP_FORTALEZA = "60060-000";
export const CEP_SP = "01310-100";

export function dadosCheckout(slugs: string[], extra: Record<string, unknown> = {}) {
  return {
    slugs,
    cliente: { nome: "Cliente Teste", email: "cliente@teste.espaco35", telefone: "(85) 99999-0000" },
    endereco: { cep: CEP_FORTALEZA, numero: "100", complemento: "Apto 101", rua: "", bairro: "" },
    freteId: "fortaleza",
    ...extra,
  };
}

export async function checkout(corpo: unknown, ip = "10.0.0.1") {
  const { POST } = await import("@/app/api/checkout/route");
  const resposta = await POST(
    new Request("http://localhost/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: typeof corpo === "string" ? corpo : JSON.stringify(corpo),
    }),
  );
  return { status: resposta.status, corpo: (await resposta.json()) as { url?: string; codigo?: string; erro?: string } };
}

// Pedido do site criado pelo checkout de verdade. Devolve o id e o código público.
export async function pedidoDoSite(slugs: string[], cliente: Partial<{ nome: string; email: string; telefone: string }> = {}, ip = "10.0.0.1") {
  const base = dadosCheckout(slugs);
  const r = await checkout({ ...base, cliente: { ...base.cliente, ...cliente } }, ip);
  if (r.status !== 200) throw new Error(`checkout de preparo falhou: ${r.status} ${r.corpo.erro}`);
  const pedido = await lerPedidoPorCodigo(r.corpo.codigo!);
  return { id: pedido.id as number, codigo: r.corpo.codigo! };
}

// Pedido do painel (venda pelo WhatsApp), criado pela mesma função do banco que o painel usa.
export async function pedidoDoPainel(lista: Product[], extra: Record<string, unknown> = {}) {
  const itens = lista.map((p) => ({ slug: p.slug, nome: p.name, codigo: p.code, categoria: p.category, preco: p.price, tabela: "varejo" }));
  const total = Math.round(lista.reduce((s, p) => s + p.price!, 0) * 100) / 100;
  const { data, error } = await admin().rpc("criar_pedido", {
    dados: { status: "novo", reservar_minutos: 24 * 60, cliente_nome: "Cliente do WhatsApp", cliente_telefone: "85912345678", itens, subtotal: total, total, ...extra },
  });
  if (error) throw error;
  const pedido = await lerPedido(data as number);
  return { id: pedido.id as number, codigo: pedido.codigo_publico as string };
}

// Faz o pedido vencer (como se o tempo tivesse passado) e roda a limpeza do banco.
export async function vencer(idPedido: number) {
  await sql("update public.pedidos set expira_em = now() - interval '1 minute' where id = $1", [idPedido]);
  await sql("update public.estoque set reservado_ate = now() - interval '1 minute' where pedido_id = $1 and status = 'reservado'", [idPedido]);
  await sql("select public.cancelar_expirados()");
}

export const emailsDoPedido = <T extends { assunto: string }>(enviados: T[], id: number): T[] => enviados.filter((e) => e.assunto.includes(`#${id} `) || e.assunto.endsWith(`#${id}`) || e.assunto.includes(`#${id}:`));

// ───────────── leitura do banco ─────────────
export async function lerPedido(id: number) {
  const { data, error } = await admin().from("pedidos").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}
export async function lerPedidoPorCodigo(codigo: string) {
  const { data, error } = await admin().from("pedidos").select("*").eq("codigo_publico", codigo).single();
  if (error) throw error;
  return data;
}
export async function pedidosAbertos() {
  const { data } = await admin().from("pedidos").select("*").eq("status", "novo").order("id");
  return data ?? [];
}
export async function situacaoPar(slug: string): Promise<{ status: string; pedido_id: number | null; reservado_ate: string | null } | null> {
  const { data } = await admin().from("estoque").select("status,pedido_id,reservado_ate").eq("slug", slug).maybeSingle();
  return data;
}

// ───────────── Mercado Pago: aviso (webhook), volta da cliente e conferência ─────────────
const SEGREDO_WEBHOOK = () => process.env.MERCADOPAGO_WEBHOOK_SECRET!;

export function assinatura(dataId: string, requestId = "req-1", ts = "1700000000", segredo = SEGREDO_WEBHOOK()) {
  const v1 = createHmac("sha256", segredo).update(`id:${dataId};request-id:${requestId};ts:${ts};`).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

export async function aviso(dataId: string, opcoes: { assinatura?: string | null; tipo?: string; corpo?: unknown } = {}) {
  const { POST } = await import("@/app/api/mercadopago/webhook/route");
  const headers: Record<string, string> = { "Content-Type": "application/json", "x-request-id": "req-1" };
  const assin = opcoes.assinatura === undefined ? assinatura(dataId) : opcoes.assinatura;
  if (assin) headers["x-signature"] = assin;
  const tipo = opcoes.tipo ?? "payment";
  const resposta = await POST(
    new Request(`http://localhost/api/mercadopago/webhook?type=${tipo}&data.id=${dataId}`, {
      method: "POST",
      headers,
      body: JSON.stringify(opcoes.corpo ?? { type: tipo, data: { id: dataId } }),
    }),
  );
  return { status: resposta.status, texto: await resposta.text() };
}

// Pagamento no "Mercado Pago" para o pedido + o aviso assinado dele.
export async function pagar(idPedido: number, dados: Partial<PagamentoFalso> & { status: string }) {
  const pedido = await lerPedido(idPedido);
  const id = novoPagamento({ external_reference: String(idPedido), transaction_amount: Number(pedido.total), ...dados });
  return { idPagamento: id, ...(await aviso(id)) };
}

export async function volta(codigo: string, consulta: string) {
  const { GET } = await import("@/app/api/mercadopago/retorno/[codigo]/route");
  const resposta = await GET(new Request(`http://localhost/api/mercadopago/retorno/${codigo}?${consulta}`), {
    params: Promise.resolve({ codigo }),
  });
  return { status: resposta.status, destino: resposta.headers.get("location") };
}

export async function conferencia(cabecalho: string | null = `Bearer ${process.env.CRON_SECRET}`) {
  const { GET } = await import("@/app/api/cron/conferir-pagamentos/route");
  const headers: Record<string, string> = {};
  if (cabecalho !== null) headers.authorization = cabecalho;
  const resposta = await GET(new Request("http://localhost/api/cron/conferir-pagamentos", { headers }));
  return { status: resposta.status, corpo: await resposta.json().catch(() => null) };
}

// ───────────── painel: usuários, login e server actions ─────────────
export const SENHA = "senha-de-teste-123";
export const EQUIPE = "vendedora@teste.espaco35";
export const DE_FORA = "curiosa@teste.espaco35";

export async function garantirUsuario(emailUsuario: string, naEquipe: boolean): Promise<string> {
  const a = admin();
  const { data: lista } = await a.auth.admin.listUsers();
  let id = lista?.users.find((u) => u.email === emailUsuario)?.id;
  if (!id) {
    const { data, error } = await a.auth.admin.createUser({ email: emailUsuario, password: SENHA, email_confirm: true });
    if (error) throw error;
    id = data.user.id;
  }
  if (naEquipe) await sql("insert into public.equipe (user_id) values ($1) on conflict do nothing", [id]);
  return id;
}

// Erro que o redirect() do Next lança: devolve o endereço para onde mandou.
export function destinoRedirect(erro: unknown): string | null {
  const digest = (erro as { digest?: string })?.digest;
  return typeof digest === "string" && digest.startsWith("NEXT_REDIRECT") ? digest.split(";")[2] : null;
}

export async function comRedirect<T>(acao: () => Promise<T>): Promise<{ redirect: string | null; resultado?: T; erro?: unknown }> {
  try {
    return { redirect: null, resultado: await acao() };
  } catch (erro) {
    const destino = destinoRedirect(erro);
    if (destino) return { redirect: destino };
    return { redirect: null, erro };
  }
}

export function formulario(campos: Record<string, string | string[]>) {
  const form = new FormData();
  for (const [k, v] of Object.entries(campos)) for (const item of [v].flat()) form.append(k, item);
  return form;
}

// Entra no painel pela ação de login de verdade (os cookies ficam na sessão de teste).
export async function entrarComo(emailUsuario: string, senha = SENHA) {
  const { entrar } = await import("@/app/painel/actions");
  return comRedirect(() => entrar({}, formulario({ email: emailUsuario, senha })));
}

export function sair() {
  sessao.cookies.clear();
}

// Cliente do Supabase com a sessão de um usuário (o que alguém faria direto do navegador com a chave pública).
export async function clienteLogado(emailUsuario: string): Promise<SupabaseClient> {
  const c = anonimo();
  const { error } = await c.auth.signInWithPassword({ email: emailUsuario, password: SENHA });
  if (error) throw error;
  return c;
}
