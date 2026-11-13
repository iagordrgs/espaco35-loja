import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { email, mp, novoPagamento } from "./apoio/externos";
import {
  EQUIPE, aviso, checkout, clienteLogado, comRedirect, conferencia, dadosCheckout, emailsDoPedido, entrarComo, formulario, garantirUsuario,
  lerPedido, limparBanco, pagar, pares, pedidoDoPainel, pedidoDoSite, situacaoPar, sql, vencer,
} from "./apoio/loja";

// Casos achados na revisão das correções (13/11/2026): cada um quebrava algo que os outros testes não cobriam.

beforeAll(async () => {
  await garantirUsuario(EQUIPE, true);
});
beforeEach(limparBanco);

const [A, B, C] = pares(3, "sandalias");

describe("Pix e cartão em análise mantêm o mesmo número de pendente para aprovado", () => {
  it("quando o Pix gerado é pago (mesmo pagamento: pendente e depois aprovado), então o pedido vira pago e sai 1 e-mail", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const idPagamento = novoPagamento({ status: "pending", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
    await aviso(idPagamento);
    mp.pagamentos.get(idPagamento)!.status = "approved";
    await aviso(idPagamento);
    expect(await lerPedido(id)).toMatchObject({ status: "pago", pagamento_id: idPagamento, pagamento_status: "approved" });
    expect((await situacaoPar(A.slug))?.status).toBe("vendido");
    expect(emailsDoPedido(email.enviados, id).map((e) => e.assunto)).toEqual([expect.stringMatching(/Novo pedido pago/)]);
  });

  it("quando o mesmo Pix é pago depois dos 30 minutos e o par ainda está livre, então o pedido vira pago", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const idPagamento = novoPagamento({ status: "pending", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
    await aviso(idPagamento);
    await vencer(id);
    mp.pagamentos.get(idPagamento)!.status = "approved";
    await aviso(idPagamento);
    expect((await lerPedido(id)).status).toBe("pago");
  });

  it("quando a cliente volta do Mercado Pago com o Pix que já estava registrado como gerado, então o pedido vira pago", async () => {
    const { id, codigo } = await pedidoDoSite([A.slug]);
    const idPagamento = novoPagamento({ status: "pending", external_reference: String(id), transaction_amount: Number((await lerPedido(id)).total) });
    await aviso(idPagamento);
    mp.pagamentos.get(idPagamento)!.status = "approved";
    const { volta } = await import("./apoio/loja");
    await volta(codigo, `payment_id=${idPagamento}`);
    expect((await lerPedido(id)).status).toBe("pago");
  });
});

describe("checkout: limite e troca de pedido", () => {
  it("quando a mesma cliente já tem 2 pedidos com Pix gerado na mesma conexão, então o 3º dá erro 429", async () => {
    const p1 = await pedidoDoSite([A.slug], {}, "10.4.4.4");
    await pagar(p1.id, { status: "pending" });
    const p2 = await pedidoDoSite([B.slug], {}, "10.4.4.4");
    await pagar(p2.id, { status: "pending" });
    const r = await checkout(dadosCheckout([C.slug]), "10.4.4.4");
    expect(r.status).toBe(429);
  });

  it("quando a cliente refaz o pedido no mesmo navegador (com o código) e o par continua na sacola, então o par não volta à venda no meio da troca", async () => {
    const anterior = await pedidoDoSite([A.slug]);
    await pagar(anterior.id, { status: "pending" });
    const r = await checkout(dadosCheckout([A.slug], { substituir: anterior.codigo, freteId: "retirada" }));
    expect(r.status).toBe(200);
    const novo = await lerPedido((await sql("select id from public.pedidos where codigo_publico = $1", [r.corpo.codigo]))[0].id);
    expect((await lerPedido(anterior.id)).status).toBe("cancelado");
    expect(await situacaoPar(A.slug)).toMatchObject({ status: "reservado", pedido_id: Number(novo.id) });
  });

  it("quando a cliente com Pix gerado tenta o mesmo par de outro aparelho (sem o código), então ouve que o par está no pedido dela, e nada é cancelado", async () => {
    const anterior = await pedidoDoSite([A.slug]);
    await pagar(anterior.id, { status: "pending" });
    const r = await checkout(dadosCheckout([A.slug]), "10.8.8.8");
    expect(r.status).toBe(409);
    expect(r.corpo.erro).toMatch(/Você já tem um pedido/);
    expect((await lerPedido(anterior.id)).status).toBe("novo");
  });
});

describe("pagamentos: casos de borda", () => {
  it("quando a equipe marcou à mão como pago e depois chega o pagamento do link, então a equipe recebe e-mail para conferir (e não 'reembolsar')", async () => {
    const { id } = await pedidoDoPainel([A], { status: "pago" });
    await pagar(id, { status: "approved" });
    const emails = emailsDoPedido(email.enviados, id);
    expect(emails).toHaveLength(1);
    expect(emails[0].assunto).toMatch(/CONFERIR/);
    expect(emails[0].html).not.toMatch(/não foi marcado como pago/);
  });

  it("quando esse e-mail de conferir não sai, então a conferência diária reenvia (a marca não some)", async () => {
    const { id } = await pedidoDoPainel([A], { status: "pago" });
    email.falhar = true;
    await pagar(id, { status: "approved" });
    email.falhar = false;
    mp.pagamentos.clear();
    await sql("update public.pedidos set atualizado_em = now() - interval '1 hour' where id = $1", [id]);
    await conferencia();
    expect(emailsDoPedido(email.enviados, id)).toHaveLength(1);
  });

  it("quando o e-mail de pagamento em dobro é reenviado pela conferência, então ele diz qual pagamento reembolsar", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved" });
    email.falhar = true;
    const segundo = await pagar(id, { status: "approved" });
    email.falhar = false;
    email.enviados.length = 0;
    mp.pagamentos.clear();
    await sql("update public.pedidos set atualizado_em = now() - interval '1 hour' where id = $1", [id]);
    await conferencia();
    const [reenvio] = emailsDoPedido(email.enviados, id);
    expect(reenvio.html).toContain(segundo.idPagamento);
  });

  it("quando o pagamento extra (em dobro) é reembolsado, então a marca de 'reembolsar' sai do pedido", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved" });
    email.falhar = true;
    const segundo = await pagar(id, { status: "approved" });
    expect((await lerPedido(id)).aviso_pendente).toBe("dobro");
    mp.pagamentos.get(segundo.idPagamento)!.status = "refunded";
    await aviso(segundo.idPagamento);
    expect((await lerPedido(id)).aviso_pendente).toBeNull();
  });

  it("quando o Mercado Pago devolve parte do valor de um pagamento que ainda não marcou o pedido como pago, então o pedido não é cancelado e a equipe recebe e-mail", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    novoPagamento({ id: 990001, status: "approved", status_detail: "partially_refunded", external_reference: String(id), transaction_amount: 50 });
    await aviso("990001");
    expect((await lerPedido(id)).status).not.toBe("cancelado");
    expect(emailsDoPedido(email.enviados, id).length).toBeGreaterThanOrEqual(1);
  });

  it("quando a equipe devolve só o que a cliente pagou a mais, então o pedido continua liberado para envio", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const total = Number((await lerPedido(id)).total);
    const { idPagamento } = await pagar(id, { status: "approved", transaction_amount: total + 20 });
    Object.assign(mp.pagamentos.get(idPagamento)!, { status_detail: "partially_refunded", transaction_amount_refunded: 20 });
    await aviso(idPagamento);
    const pedido = await lerPedido(id);
    expect(pedido).toMatchObject({ status: "pago", pagamento_status: "approved" });
    expect(pedido.observacoes ?? "").not.toMatch(/NÃO ENVIAR/);
  });
});

describe("painel e banco: travas que não podem ser contornadas", () => {
  it("quando um pedido do painel estornado é reaberto, vence e a equipe tenta enviar, então o banco recusa", async () => {
    await entrarComo(EQUIPE);
    const { id } = await pedidoDoPainel([A]);
    const { idPagamento } = await pagar(id, { status: "approved" });
    mp.pagamentos.get(idPagamento)!.status = "refunded";
    await aviso(idPagamento);
    const { atualizarPedido } = await import("@/app/painel/actions");
    await comRedirect(() => atualizarPedido(formulario({ id: String(id), status: "novo" })));
    await vencer(id);
    expect((await lerPedido(id)).pagamento_status).toBe("refunded");
    const r = await comRedirect(() => atualizarPedido(formulario({ id: String(id), status: "enviado" })));
    expect(String((r.erro as Error | undefined)?.message ?? "")).toMatch(/Não envie/);
    expect((await lerPedido(id)).status).not.toBe("enviado");
  });

  it("quando um membro da equipe tenta apagar um pedido do site direto no banco, então o banco recusa", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const c = await clienteLogado(EQUIPE);
    await c.from("pedidos").delete().eq("id", id);
    expect(await sql("select id from public.pedidos where id = $1", [id])).toHaveLength(1);
  });

  it("quando um membro da equipe tenta apagar a marca de aviso pendente direto no banco, então o banco recusa", async () => {
    email.falhar = true;
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved" });
    const c = await clienteLogado(EQUIPE);
    await c.from("pedidos").update({ aviso_pendente: null }).eq("id", id);
    expect((await lerPedido(id)).aviso_pendente).toBe("pago");
  });
});

describe("segunda revisão: o que as correções não podiam quebrar", () => {
  it("quando a conferência diária vê a devolução só do valor a mais, então o pedido continua liberado para envio", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const total = Number((await lerPedido(id)).total);
    const { idPagamento } = await pagar(id, { status: "approved", transaction_amount: total + 20 });
    Object.assign(mp.pagamentos.get(idPagamento)!, { status_detail: "partially_refunded", transaction_amount_refunded: 20 });
    await aviso(idPagamento);
    await conferencia();
    const pedido = await lerPedido(id);
    expect(pedido).toMatchObject({ status: "pago", pagamento_status: "approved" });
    expect(pedido.observacoes ?? "").not.toMatch(/NÃO ENVIAR/);
  });

  it("quando a cliente refaz o pedido e depois paga o Pix do pedido antigo, então o antigo vira pago e o novo é cancelado", async () => {
    const antigo = await pedidoDoSite([A.slug]);
    const pix = novoPagamento({ status: "pending", external_reference: String(antigo.id), transaction_amount: Number((await lerPedido(antigo.id)).total) });
    await aviso(pix);
    const r = await checkout(dadosCheckout([A.slug], { substituir: antigo.codigo }));
    const [{ id: novoId }] = await sql("select id from public.pedidos where codigo_publico = $1", [r.corpo.codigo]);
    mp.pagamentos.get(pix)!.status = "approved";
    await aviso(pix);
    expect((await lerPedido(antigo.id)).status).toBe("pago");
    expect((await lerPedido(Number(novoId))).status).toBe("cancelado");
    expect(await situacaoPar(A.slug)).toMatchObject({ status: "vendido", pedido_id: antigo.id });
    expect(emailsDoPedido(email.enviados, antigo.id).map((e) => e.assunto)).toEqual([expect.stringMatching(/Novo pedido pago/)]);
  });

  it("quando a cliente troca de pedido várias vezes, então a reserva do par não passa do prazo do Pix que ela gerou", async () => {
    const primeiro = await pedidoDoSite([A.slug]);
    await pagar(primeiro.id, { status: "pending" });
    const prazo = new Date((await situacaoPar(A.slug))!.reservado_ate!).getTime();
    let codigo = primeiro.codigo;
    for (let i = 0; i < 3; i++) {
      await sql("update public.pedidos set criado_em = criado_em - interval '20 minutes', expira_em = expira_em + interval '20 minutes' where status = 'novo'");
      const r = await checkout(dadosCheckout([A.slug], { substituir: codigo }));
      codigo = r.corpo.codigo!;
    }
    expect(new Date((await situacaoPar(A.slug))!.reservado_ate!).getTime()).toBeLessThanOrEqual(prazo);
  });

  it("quando o aviso de devolução parcial de um pedido não pago se repete, então a equipe recebe 1 e-mail só", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    novoPagamento({ id: 990002, status: "approved", status_detail: "partially_refunded", external_reference: String(id), transaction_amount: 50 });
    await aviso("990002");
    await aviso("990002");
    await aviso("990002");
    expect(emailsDoPedido(email.enviados, id)).toHaveLength(1);
  });

  it("quando o dono apaga um pedido pela chave de serviço (ex.: pedido de teste ou pedido de exclusão de dados), então o pedido é apagado", async () => {
    const { id } = await pedidoDoPainel([A]);
    const { admin } = await import("./apoio/loja");
    await admin().from("pedidos").delete().eq("id", id);
    expect(await sql("select id from public.pedidos where id = $1", [id])).toHaveLength(0);
  });

  it("quando a equipe reabre um pedido que o sistema cancelou e ele vence, então a limpeza dos vencidos funciona com a sessão da equipe", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await sql("select public.cancelar_pedido_site($1, 'erro_checkout')", [id]);
    const c = await clienteLogado(EQUIPE);
    expect((await c.rpc("atualizar_pedido", { pedido: id, novo_status: "novo" })).error).toBeNull();
    await sql("update public.pedidos set expira_em = now() - interval '1 minute' where id = $1", [id]);
    const { error } = await c.rpc("cancelar_expirados");
    expect(error).toBeNull();
    expect((await lerPedido(id)).status).toBe("cancelado");
  });

  it("quando o pagamento em dobro entra em disputa (não foi devolvido), então a marca de 'reembolsar' continua", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    await pagar(id, { status: "approved" });
    email.falhar = true;
    const segundo = await pagar(id, { status: "approved" });
    mp.pagamentos.get(segundo.idPagamento)!.status = "in_mediation";
    await aviso(segundo.idPagamento);
    expect((await lerPedido(id)).aviso_pendente).toBe("dobro");
  });
});
