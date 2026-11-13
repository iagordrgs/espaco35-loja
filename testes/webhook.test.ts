import { beforeEach, describe, expect, it } from "vitest";
import { email, mp, novoPagamento } from "./apoio/externos";
import {
  assinatura, aviso, emailsDoPedido, lerPedido, limparBanco, pagar, pares, pedidoDoPainel, pedidoDoSite, situacaoPar, sql, vencer,
} from "./apoio/loja";

beforeEach(limparBanco);

const [A, B] = pares(2, "sandalias");
const RODADAS = 5; // corridas: o resultado certo tem de sair em todas as rodadas

describe("aviso do Mercado Pago: segurança", () => {
  const semMudanca = { status: "novo", pagamento_status: null, pagamento_id: null };

  it("quando a assinatura é inválida, então dá erro 401 e o pedido não muda", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const idPagamento = novoPagamento({ status: "approved", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
    const r = await aviso(idPagamento, { assinatura: assinatura(idPagamento, "req-1", "1700000000", "segredo-errado") });
    expect(r.status).toBe(401);
    expect(await lerPedido(id)).toMatchObject(semMudanca);
  });

  it("quando o aviso chega sem assinatura, então dá erro 401 e o pedido não muda", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const idPagamento = novoPagamento({ status: "approved", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
    expect((await aviso(idPagamento, { assinatura: null })).status).toBe(401);
    expect(await lerPedido(id)).toMatchObject(semMudanca);
  });

  it("quando a assinatura vale para um pagamento e o corpo traz outro, então só o da assinatura é considerado", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const recusado = novoPagamento({ status: "rejected", external_reference: String(id) });
    const outro = novoPagamento({ status: "approved", external_reference: String(id), transaction_amount: 999 });
    await aviso(recusado, { corpo: { type: "payment", data: { id: outro } } });
    expect((await lerPedido(id)).status).toBe("cancelado");
  });

  it("quando o aviso não é de pagamento, então responde 200 e nada muda", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    expect((await aviso("123", { tipo: "merchant_order" })).status).toBe(200);
    expect((await lerPedido(id)).status).toBe("novo");
  });
});

describe("aviso do Mercado Pago: pagamento aprovado", () => {
  it("quando o pagamento é aprovado com o valor certo, então o pedido vira pago, o par vira vendido e a equipe recebe 1 e-mail", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const r = await pagar(id, { status: "approved" });
    expect(r.status).toBe(200);
    expect(await lerPedido(id)).toMatchObject({ status: "pago", pagamento_status: "approved", pagamento_id: r.idPagamento, aviso_pendente: null });
    expect(await situacaoPar(A.slug)).toMatchObject({ status: "vendido", pedido_id: id });
    expect(emailsDoPedido(email.enviados, id)).toHaveLength(1);
    expect(email.enviados[0].assunto).toMatch(/Novo pedido pago/);
  });

  it("quando o valor pago é menor que o total, então o pedido não vira pago, ganha 'Não enviar' e a equipe recebe e-mail para conferir", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const total = Number((await lerPedido(id)).total);
    await pagar(id, { status: "approved", transaction_amount: total - 10 });
    const pedido = await lerPedido(id);
    expect(pedido).toMatchObject({ status: "novo", pagamento_status: "valor_divergente" });
    expect(pedido.observacoes).toMatch(/Não enviar/);
    expect(email.enviados.map((e) => e.assunto)).toEqual([expect.stringMatching(/CONFERIR/)]);
  });

  it("quando o pagamento vem em outra moeda, então o pedido não vira pago e vai para conferir", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved", currency_id: "USD" });
    expect(await lerPedido(id)).toMatchObject({ status: "novo", pagamento_status: "valor_divergente" });
  });

  it("quando a cliente paga a mais, então o pedido vira pago e a equipe é avisada do valor a mais", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const total = Number((await lerPedido(id)).total);
    const pago = total + 50;
    await pagar(id, { status: "approved", transaction_amount: pago });
    expect(await lerPedido(id)).toMatchObject({ status: "pago", pagamento_status: "approved" });
    expect((await situacaoPar(A.slug))?.status).toBe("vendido");
    const valorPago = pago.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const avisoAMais = emailsDoPedido(email.enviados, id).some((e) => e.html.includes(valorPago) && /a mais/i.test(e.assunto + e.html));
    expect(avisoAMais).toBe(true);
  });

  it("quando o e-mail para a equipe falha, então o pedido fica pago e com o aviso pendente marcado", async () => {
    email.falhar = true;
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved" });
    expect(await lerPedido(id)).toMatchObject({ status: "pago", aviso_pendente: "pago" });
  });

  it("quando o pedido não existe, então responde 200 (repetir não adianta)", async () => {
    const idPagamento = novoPagamento({ status: "approved", external_reference: "999999", transaction_amount: 10 });
    expect((await aviso(idPagamento)).status).toBe(200);
  });

  it("quando a API do Mercado Pago está fora, então responde 500 (o Mercado Pago repete) e o pedido não muda", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const idPagamento = novoPagamento({ status: "approved", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
    mp.fora = true;
    expect((await aviso(idPagamento)).status).toBe(500);
    expect(await lerPedido(id)).toMatchObject({ status: "novo", pagamento_status: null, pagamento_id: null });
  });

  it("quando o pedido do painel (link de pagamento) é pago, então vira pago e a equipe recebe o e-mail do link", async () => {
    const { id } = await pedidoDoPainel([A]);
    await pagar(id, { status: "approved" });
    expect((await lerPedido(id)).status).toBe("pago");
    expect(emailsDoPedido(email.enviados, id)[0].html).toMatch(/link de pagamento/);
  });
});

describe("aviso do Mercado Pago: Pix gerado, recusa e reserva", () => {
  it("quando o Pix é gerado, então o par fica reservado para a cliente até o pedido vencer", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "pending" });
    const pedido = await lerPedido(id);
    expect(pedido).toMatchObject({ status: "novo", pagamento_status: "pending" });
    const par = await situacaoPar(A.slug);
    expect(par).toMatchObject({ status: "reservado", pedido_id: id });
    expect(new Date(par!.reservado_ate!).getTime()).toBe(new Date(pedido.expira_em).getTime());
  });

  it("quando o Pix é gerado mas outra cliente já reservou o par, então o pagamento é cancelado no Mercado Pago e o pedido também", async () => {
    const primeira = await pedidoDoSite([A.slug], { email: "primeira@teste.espaco35", telefone: "85911110000" });
    const segunda = await pedidoDoSite([A.slug], { email: "segunda@teste.espaco35", telefone: "85922220000" }, "10.0.0.2");
    await pagar(primeira.id, { status: "pending" });
    const r = await pagar(segunda.id, { status: "pending" });
    expect(mp.cancelados).toEqual([r.idPagamento]);
    expect(await lerPedido(segunda.id)).toMatchObject({ status: "cancelado", pagamento_status: "par_indisponivel" });
    expect(await situacaoPar(A.slug)).toMatchObject({ status: "reservado", pedido_id: primeira.id });
  });

  it("quando o pagamento é recusado, então o pedido é cancelado e o par volta à venda", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "rejected" });
    expect(await lerPedido(id)).toMatchObject({ status: "cancelado", pagamento_status: "rejected" });
    expect((await situacaoPar(A.slug))?.status ?? "disponivel").toBe("disponivel");
  });

  it("quando a cliente gera o Pix e depois um cartão dela é recusado, então o pedido continua de pé com o par reservado", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "pending" });
    await pagar(id, { status: "rejected" });
    expect((await lerPedido(id)).status).toBe("novo");
    expect((await situacaoPar(A.slug))?.status).toBe("reservado");
  });

  it("quando um Pix é gerado depois de um pagamento com valor divergente, então o registro do pagamento anterior fica no pedido", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const total = Number((await lerPedido(id)).total);
    const divergente = await pagar(id, { status: "approved", transaction_amount: total - 10 });
    await pagar(id, { status: "pending" });
    expect(await lerPedido(id)).toMatchObject({ pagamento_id: divergente.idPagamento, pagamento_status: "valor_divergente" });
  });

  it("quando o pedido do painel tem o pagamento recusado, então o pedido continua 'novo' (a equipe decide)", async () => {
    const { id } = await pedidoDoPainel([A]);
    await pagar(id, { status: "rejected" });
    expect((await lerPedido(id)).status).toBe("novo");
  });
});

describe("aviso do Mercado Pago: pago depois de vencer", () => {
  it("quando o Pix é pago depois dos 30 minutos e o par ainda está livre, então o pedido vira pago", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "pending" });
    await vencer(id);
    expect((await lerPedido(id)).status).toBe("cancelado");
    await pagar(id, { status: "approved" });
    expect((await lerPedido(id)).status).toBe("pago");
    expect((await situacaoPar(A.slug))?.status).toBe("vendido");
  });

  it("quando o Pix é pago depois dos 30 minutos e o par já é de outra cliente, então não vira pago e a equipe confere", async () => {
    const primeira = await pedidoDoSite([A.slug], { email: "primeira@teste.espaco35", telefone: "85911110000" });
    await vencer(primeira.id);
    const segunda = await pedidoDoSite([A.slug], { email: "segunda@teste.espaco35", telefone: "85922220000" }, "10.0.0.2");
    await pagar(segunda.id, { status: "approved" });
    await pagar(primeira.id, { status: "approved" });
    const pedido = await lerPedido(primeira.id);
    expect(pedido.status).toBe("cancelado");
    expect(pedido.observacoes).toMatch(/ATENÇÃO/);
    expect(emailsDoPedido(email.enviados, primeira.id).map((e) => e.assunto)).toEqual([expect.stringMatching(/CONFERIR/)]);
  });

  it("quando a equipe cancelou o pedido e o pagamento é aprovado depois, então não vira pago e a equipe confere", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await sql("select public.atualizar_pedido($1, 'cancelado')", [id]);
    await pagar(id, { status: "approved" });
    expect((await lerPedido(id)).status).toBe("cancelado");
    expect(emailsDoPedido(email.enviados, id).map((e) => e.assunto)).toEqual([expect.stringMatching(/CONFERIR/)]);
  });
});

describe("aviso do Mercado Pago: estorno e disputa", () => {
  async function pedidoPago() {
    const { id } = await pedidoDoSite([A.slug]);
    const { idPagamento } = await pagar(id, { status: "approved" });
    email.enviados.length = 0;
    return { id, idPagamento };
  }

  it("quando o pagamento de um pedido pago é estornado, então o pedido ganha 'NÃO ENVIAR' e a equipe recebe e-mail", async () => {
    const { id, idPagamento } = await pedidoPago();
    mp.pagamentos.get(idPagamento)!.status = "refunded";
    await aviso(idPagamento);
    const pedido = await lerPedido(id);
    expect(pedido).toMatchObject({ status: "pago", pagamento_status: "refunded" });
    expect(pedido.observacoes).toMatch(/NÃO ENVIAR/);
    expect(email.enviados.map((e) => e.assunto)).toEqual([expect.stringMatching(/NÃO ENVIAR/)]);
  });

  it("quando o pagamento de um pedido pago é contestado (chargeback), então o pedido ganha 'NÃO ENVIAR' e a equipe recebe e-mail", async () => {
    const { id, idPagamento } = await pedidoPago();
    mp.pagamentos.get(idPagamento)!.status = "charged_back";
    await aviso(idPagamento);
    expect((await lerPedido(id)).observacoes).toMatch(/NÃO ENVIAR/);
    expect(email.enviados.map((e) => e.assunto)).toEqual([expect.stringMatching(/NÃO ENVIAR/)]);
  });

  it("quando o Mercado Pago devolve só parte do valor de um pedido pago, então o pedido ganha 'NÃO ENVIAR' e a equipe recebe e-mail", async () => {
    const { id, idPagamento } = await pedidoPago();
    mp.pagamentos.get(idPagamento)!.status_detail = "partially_refunded";
    await aviso(idPagamento);
    const pedido = await lerPedido(id);
    expect(pedido.status).toBe("pago");
    expect(pedido.observacoes ?? "").toMatch(/NÃO ENVIAR/);
    expect(email.enviados.map((e) => e.assunto)).toEqual([expect.stringMatching(/NÃO ENVIAR/)]);
  });

  it("quando é estornado um pagamento extra (não o que pagou o pedido), então o pedido continua pago, sem e-mail de estorno", async () => {
    const { id } = await pedidoPago();
    const extra = novoPagamento({ status: "refunded", external_reference: String(id), transaction_amount: 10 });
    await aviso(extra);
    expect(await lerPedido(id)).toMatchObject({ status: "pago", pagamento_status: "approved" });
    expect(email.enviados.filter((e) => /NÃO ENVIAR/.test(e.assunto))).toHaveLength(0);
  });

  it("quando um pedido ainda não pago entra em disputa, então ele não é cancelado", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "in_mediation" });
    expect((await lerPedido(id)).status).toBe("novo");
  });
});

describe("aviso do Mercado Pago: repetição", () => {
  it("quando o mesmo aviso chega 2 vezes, então o pedido é pago 1 vez e sai 1 e-mail", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const { idPagamento } = await pagar(id, { status: "approved" });
    const antes = await lerPedido(id);
    expect((await aviso(idPagamento)).status).toBe(200);
    const depois = await lerPedido(id);
    expect(depois.status).toBe("pago");
    expect(depois.observacoes).toBe(antes.observacoes);
    expect(emailsDoPedido(email.enviados, id)).toHaveLength(1);
  });

  it("quando 2 cópias do mesmo aviso chegam juntas, então o pedido é pago 1 vez e sai 1 e-mail", async () => {
    const resultados: number[] = [];
    for (let i = 0; i < RODADAS; i++) {
      await limparBanco();
      email.enviados.length = 0;
      const { id } = await pedidoDoSite([A.slug]);
      const idPagamento = novoPagamento({ status: "approved", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
      const respostas = await Promise.all([aviso(idPagamento), aviso(idPagamento)]);
      expect(respostas.map((r) => r.status)).toEqual([200, 200]);
      expect((await lerPedido(id)).status).toBe("pago");
      resultados.push(emailsDoPedido(email.enviados, id).length);
    }
    expect(resultados).toEqual(Array(RODADAS).fill(1));
  });

  it("quando a cliente paga 2 vezes o mesmo pedido, então a equipe recebe e-mail na hora sobre o pagamento em dobro", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const primeiro = await pagar(id, { status: "approved" });
    const segundo = await pagar(id, { status: "approved" });
    expect(await lerPedido(id)).toMatchObject({ status: "pago", pagamento_id: primeiro.idPagamento });
    const emails = emailsDoPedido(email.enviados, id);
    expect(emails).toHaveLength(2);
    expect(emails[1].assunto + emails[1].html).toMatch(/dobro|duas vezes|reembols/i);
    expect(emails[1].html).toContain(segundo.idPagamento);
  });

  it("quando duas clientes geram o Pix do mesmo par ao mesmo tempo, então só uma fica com a reserva e o outro pagamento é cancelado", async () => {
    for (let i = 0; i < RODADAS; i++) {
      await limparBanco();
      mp.cancelados.length = 0;
      const p1 = await pedidoDoSite([A.slug], { email: "p1@teste.espaco35", telefone: "85911110001" }, "10.1.1.1");
      const p2 = await pedidoDoSite([A.slug], { email: "p2@teste.espaco35", telefone: "85911110002" }, "10.1.1.2");
      const g1 = novoPagamento({ status: "pending", external_reference: String(p1.id) });
      const g2 = novoPagamento({ status: "pending", external_reference: String(p2.id) });
      await Promise.all([aviso(g1), aviso(g2)]);
      const status = [(await lerPedido(p1.id)).status, (await lerPedido(p2.id)).status].sort();
      expect(status).toEqual(["cancelado", "novo"]);
      expect(mp.cancelados).toHaveLength(1);
    }
  });

  it("quando duas clientes pagam o mesmo par ao mesmo tempo, então só uma leva o par e a outra vai para conferir", async () => {
    for (let i = 0; i < RODADAS; i++) {
      await limparBanco();
      const p1 = await pedidoDoSite([A.slug], { email: "p1@teste.espaco35", telefone: "85911110001" }, "10.1.1.1");
      const p2 = await pedidoDoSite([A.slug], { email: "p2@teste.espaco35", telefone: "85911110002" }, "10.1.1.2");
      const total = Number((await lerPedido(p1.id)).total);
      const a1 = novoPagamento({ status: "approved", external_reference: String(p1.id), transaction_amount: total });
      const a2 = novoPagamento({ status: "approved", external_reference: String(p2.id), transaction_amount: total });
      await Promise.all([aviso(a1), aviso(a2)]);
      const status = [(await lerPedido(p1.id)).status, (await lerPedido(p2.id)).status].sort();
      expect(status).toEqual(["novo", "pago"]);
      expect((await situacaoPar(A.slug))?.status).toBe("vendido");
    }
  });
});

describe("aviso do Mercado Pago: pares diferentes não se misturam", () => {
  it("quando um pedido é pago, então o par de outro pedido aberto continua livre", async () => {
    const p1 = await pedidoDoSite([A.slug], { email: "p1@teste.espaco35", telefone: "85911110001" });
    await pedidoDoSite([B.slug], { email: "p2@teste.espaco35", telefone: "85911110002" }, "10.0.0.2");
    await pagar(p1.id, { status: "approved" });
    expect((await situacaoPar(B.slug))?.status ?? "disponivel").toBe("disponivel");
  });
});
