import { beforeEach, describe, expect, it } from "vitest";
import { email, mp, novoPagamento } from "./apoio/externos";
import { aviso, conferencia, emailsDoPedido, lerPedido, limparBanco, pagar, pares, pedidoDoSite, sql, volta } from "./apoio/loja";

beforeEach(limparBanco);

const [A] = pares(1, "sandalias");
const RODADAS = 5;

async function pagamentoAprovado(id: number) {
  return novoPagamento({ status: "approved", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
}

describe("volta da cliente do Mercado Pago", () => {
  it("quando a cliente volta com o pagamento aprovado, então o pedido é registrado como pago e ela vai para a página do pedido", async () => {
    const { id, codigo } = await pedidoDoSite([A.slug]);
    const idPagamento = await pagamentoAprovado(id);
    const r = await volta(codigo, `payment_id=${idPagamento}&status=approved`);
    expect(r.status).toBe(303);
    expect(r.destino).toBe(`http://localhost/pedido/${codigo}?status=approved`);
    expect((await lerPedido(id)).status).toBe("pago");
    expect(emailsDoPedido(email.enviados, id)).toHaveLength(1);
  });

  it("quando o endereço traz o pagamento de outro pedido, então nenhum pedido muda", async () => {
    const meu = await pedidoDoSite([A.slug], { email: "eu@teste.espaco35", telefone: "85911110001" });
    const outro = await pedidoDoSite([pares(2)[1].slug], { email: "outra@teste.espaco35", telefone: "85911110002" }, "10.0.0.2");
    const doOutro = await pagamentoAprovado(outro.id);
    await volta(meu.codigo, `payment_id=${doOutro}`);
    expect((await lerPedido(meu.id)).status).toBe("novo");
    expect((await lerPedido(outro.id)).status).toBe("novo");
  });

  it("quando alguém usa o código do pedido de outra pessoa com o próprio pagamento, então o pedido dela não muda", async () => {
    const dela = await pedidoDoSite([A.slug], { email: "dela@teste.espaco35", telefone: "85911110003" });
    const meu = await pedidoDoSite([pares(2)[1].slug], { email: "eu2@teste.espaco35", telefone: "85911110004" }, "10.0.0.2");
    const meuPagamento = await pagamentoAprovado(meu.id);
    await volta(dela.codigo, `payment_id=${meuPagamento}`);
    expect((await lerPedido(dela.id)).status).toBe("novo");
  });

  it("quando o código não é válido, então só redireciona: não consulta o Mercado Pago e nenhum pedido muda", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const idPagamento = await pagamentoAprovado(id);
    mp.chamadas = 0;
    const r = await volta("nao-e-um-codigo", `payment_id=${idPagamento}`);
    expect(r.status).toBe(303);
    expect(mp.chamadas).toBe(0);
    expect((await lerPedido(id)).status).toBe("novo");
  });

  it("quando o pagamento no endereço não é um número, então só redireciona: não consulta o Mercado Pago", async () => {
    const { id, codigo } = await pedidoDoSite([A.slug]);
    await pagamentoAprovado(id);
    mp.chamadas = 0;
    const r = await volta(codigo, "payment_id=abc");
    expect(r.status).toBe(303);
    expect(mp.chamadas).toBe(0);
    expect((await lerPedido(id)).status).toBe("novo");
  });

  it("quando o código tenta mandar para outro site, então a cliente continua no site da loja", async () => {
    const r = await volta("//site-falso.com", "payment_id=1");
    expect(new URL(r.destino!).host).toBe("localhost");
  });

  it("quando o Mercado Pago está fora, então a cliente segue para a página do pedido do mesmo jeito", async () => {
    const { codigo } = await pedidoDoSite([A.slug]);
    mp.fora = true;
    const r = await volta(codigo, "payment_id=123&status=approved");
    expect(r.status).toBe(303);
    expect(r.destino).toContain(`/pedido/${codigo}`);
  });

  it("quando a volta e o aviso chegam ao mesmo tempo, então o pedido é pago 1 vez e sai 1 e-mail", async () => {
    const emails: number[] = [];
    for (let i = 0; i < RODADAS; i++) {
      await limparBanco();
      email.enviados.length = 0;
      const { id, codigo } = await pedidoDoSite([A.slug]);
      const idPagamento = await pagamentoAprovado(id);
      await Promise.all([volta(codigo, `payment_id=${idPagamento}`), aviso(idPagamento)]);
      expect((await lerPedido(id)).status).toBe("pago");
      emails.push(emailsDoPedido(email.enviados, id).length);
    }
    expect(emails).toEqual(Array(RODADAS).fill(1));
  });
});

// Todo texto e atributo que a página manda para o navegador (percorre a árvore do React pelas props).
function textoDa(no: unknown, vistos = new Set<unknown>()): string {
  if (no == null || typeof no === "boolean") return "";
  if (typeof no === "string" || typeof no === "number") return `${no} `;
  if (typeof no !== "object" || vistos.has(no)) return "";
  vistos.add(no);
  if (Array.isArray(no)) return no.map((n) => textoDa(n, vistos)).join("");
  const props = (no as { props?: Record<string, unknown> }).props;
  // elemento do React: lê as props; objeto solto passado como prop: lê todos os campos
  const valores = props ? Object.values(props) : Object.values(no as Record<string, unknown>);
  return valores.map((v) => textoDa(v, vistos)).join("");
}

describe("página do pedido", () => {
  async function abrir(codigo: string, busca: Record<string, string> = {}) {
    const { default: PedidoPage } = await import("@/app/(loja)/pedido/[codigo]/page");
    try {
      const pagina = await PedidoPage({ params: Promise.resolve({ codigo }), searchParams: Promise.resolve(busca) });
      return { status: 200, texto: textoDa(pagina) };
    } catch (erro) {
      const digest = String((erro as { digest?: string }).digest ?? "");
      if (digest.includes("404")) return { status: 404, texto: "" };
      throw erro;
    }
  }

  it("quando o código está certo, então mostra o pedido sem nome, e-mail, telefone nem endereço da cliente", async () => {
    const { codigo } = await pedidoDoSite([A.slug], { nome: "Maria Sigilosa", email: "maria.sigilo@teste.espaco35", telefone: "85987654321" });
    const r = await abrir(codigo);
    expect(r.status).toBe(200);
    expect(r.texto).toContain("Aguardando o pagamento"); // a página foi lida de verdade
    for (const dado of ["Maria Sigilosa", "maria.sigilo", "987654321", "Floriano", "Apto 101"]) expect(r.texto).not.toContain(dado);
  });

  it.each(["00000000-0000-4000-8000-000000000000", "codigo-invalido", "------------------------------------"])(
    "quando o código é %s, então a página não existe (404)",
    async (codigo) => {
      expect((await abrir(codigo)).status).toBe(404);
    },
  );

  it("quando alguém escreve 'approved' no endereço, então a página não diz que o pagamento foi aprovado", async () => {
    const { codigo } = await pedidoDoSite([A.slug]);
    const r = await abrir(codigo, { collection_status: "approved", status: "approved" });
    expect(r.texto).toContain("Confirmando o pagamento");
    expect(r.texto).not.toContain("Pagamento aprovado!");
  });
});

describe("conferência diária dos pagamentos", () => {
  it.each([
    ["sem o cabeçalho", null],
    ["com o segredo errado", "Bearer segredo-errado"],
    ["com outro tipo de cabeçalho", `Basic ${process.env.CRON_SECRET}`],
    ["com espaço a mais", `Bearer  ${process.env.CRON_SECRET}`],
  ])("quando é chamada %s, então dá erro 401", async (_caso, cabecalho) => {
    expect((await conferencia(cabecalho)).status).toBe(401);
  });

  it("quando o CRON_SECRET não está configurado, então ninguém consegue chamar (401)", async () => {
    const segredo = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      expect((await conferencia("Bearer ")).status).toBe(401);
      expect((await conferencia("Bearer undefined")).status).toBe(401);
    } finally {
      process.env.CRON_SECRET = segredo;
    }
  });

  it("quando um pagamento aprovado não foi avisado, então a conferência marca o pedido como pago e manda o resumo", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagamentoAprovado(id); // aprovado no Mercado Pago, mas o aviso nunca chegou
    const r = await conferencia();
    expect(r.status).toBe(200);
    expect(r.corpo.acertados).toHaveLength(1);
    expect((await lerPedido(id)).status).toBe("pago");
    expect(email.enviados.map((e) => e.assunto)).toEqual(expect.arrayContaining([expect.stringMatching(/Conferência dos pagamentos/), expect.stringMatching(/Novo pedido pago/)]));
  });

  it("quando está tudo em dia, então não manda e-mail de resumo", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved" });
    email.enviados.length = 0;
    const r = await conferencia();
    expect(r.corpo.acertados).toHaveLength(0);
    expect(email.enviados).toHaveLength(0);
  });

  it("quando um e-mail de pedido pago não saiu, então a conferência reenvia e tira a marca", async () => {
    email.falhar = true;
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved" });
    email.falhar = false;
    await sql("update public.pedidos set atualizado_em = now() - interval '1 hour' where id = $1", [id]);
    const r = await conferencia();
    expect(r.corpo.avisosReenviados).toBe(1);
    expect((await lerPedido(id)).aviso_pendente).toBeNull();
  });

  it("quando duas conferências rodam ao mesmo tempo, então o e-mail pendente não sai em dobro", async () => {
    const reenvios: number[] = [];
    for (let i = 0; i < RODADAS; i++) {
      await limparBanco();
      email.falhar = true;
      const { id } = await pedidoDoSite([A.slug]);
      await pagar(id, { status: "approved" });
      email.falhar = false;
      email.enviados.length = 0;
      await sql("update public.pedidos set atualizado_em = now() - interval '1 hour' where id = $1", [id]);
      mp.pagamentos.clear();
      await Promise.all([conferencia(), conferencia()]);
      reenvios.push(emailsDoPedido(email.enviados, id).length);
    }
    expect(reenvios).toEqual(Array(RODADAS).fill(1));
  });
});
