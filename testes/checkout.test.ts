import { beforeEach, describe, expect, it } from "vitest";
import { email, mp } from "./apoio/externos";
import {
  CEP_SP, checkout, dadosCheckout, lerPedido, lerPedidoPorCodigo, limparBanco, pagar, pares, pedidoDoSite, pedidosAbertos, situacaoPar, sql,
} from "./apoio/loja";

beforeEach(limparBanco);

const [A, B, C] = pares(3, "sandalias");
const FRETE_FORTALEZA = 15;

describe("checkout do site: caminho feliz", () => {
  it("quando a cliente manda pares livres, dados válidos e frete escolhido, então nasce 1 pedido 'novo' com o link do Mercado Pago", async () => {
    const r = await checkout(dadosCheckout([A.slug, B.slug]));
    expect(r.status).toBe(200);
    expect(r.corpo.url).toMatch(/^https:\/\/mp\.teste\/pagar\//);
    const pedido = await lerPedidoPorCodigo(r.corpo.codigo!);
    expect(pedido).toMatchObject({ status: "novo", origem: "site", cliente_email: "cliente@teste.espaco35" });
    expect(Number(pedido.subtotal)).toBeCloseTo(A.price! + B.price!, 2);
    expect(Number(pedido.frete)).toBe(FRETE_FORTALEZA);
    expect(Number(pedido.total)).toBeCloseTo(A.price! + B.price! + FRETE_FORTALEZA, 2);
    expect(mp.preferencias).toHaveLength(1);
    expect(mp.preferencias[0].corpo.external_reference).toBe(String(pedido.id));
  });

  it("quando o pedido nasce, então o par continua à venda até o Pix ou o cartão (não fica reservado)", async () => {
    await checkout(dadosCheckout([A.slug]));
    const par = await situacaoPar(A.slug);
    expect(par?.status ?? "disponivel").toBe("disponivel");
  });

  it("quando o CEP é de Fortaleza, então as opções são motoboy por R$ 15 ou retirada grátis, e a retirada não vira linha de R$ 0 no Mercado Pago", async () => {
    const r = await checkout(dadosCheckout([A.slug], { freteId: "retirada" }));
    expect(r.status).toBe(200);
    const pedido = await lerPedidoPorCodigo(r.corpo.codigo!);
    expect(Number(pedido.frete)).toBe(0);
    const itens = mp.preferencias[0].corpo.items as { id: string }[];
    expect(itens.map((i) => i.id)).toEqual([A.slug]);
  });

  it("quando o CEP é de fora de Fortaleza, então o frete é o cotado no Melhor Envio", async () => {
    const r = await checkout(dadosCheckout([A.slug], { endereco: { cep: CEP_SP, numero: "1", complemento: "Sala 2" }, freteId: "me-1" }));
    expect(r.status).toBe(200);
    expect(Number((await lerPedidoPorCodigo(r.corpo.codigo!)).frete)).toBe(32.5);
  });

  it("quando o navegador manda um preço adulterado, então o preço é ignorado e vale o do catálogo", async () => {
    const r = await checkout({ ...dadosCheckout([A.slug]), total: 1, subtotal: 1, frete: 0, itens: [{ slug: A.slug, preco: 1 }], preco: 1 });
    const pedido = await lerPedidoPorCodigo(r.corpo.codigo!);
    expect(Number(pedido.total)).toBeCloseTo(A.price! + FRETE_FORTALEZA, 2);
    const itens = mp.preferencias[0].corpo.items as { unit_price: number }[];
    expect(itens[0].unit_price).toBe(A.price);
  });
});

describe("checkout do site: erros esperados", () => {
  it("quando o pagamento online está desligado, então dá erro 503 e nenhum pedido é criado", async () => {
    const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
    delete process.env.MERCADOPAGO_ACCESS_TOKEN;
    try {
      const r = await checkout(dadosCheckout([A.slug]));
      expect(r.status).toBe(503);
    } finally {
      process.env.MERCADOPAGO_ACCESS_TOKEN = token;
    }
    expect(await pedidosAbertos()).toHaveLength(0);
  });

  it("quando um par não existe no catálogo, então dá erro 'Sua sacola mudou' e nenhum pedido", async () => {
    const r = await checkout(dadosCheckout([A.slug, "par-que-nao-existe"]));
    expect(r.status).toBe(400);
    expect(r.corpo.erro).toMatch(/sacola mudou/);
    expect(await pedidosAbertos()).toHaveLength(0);
  });

  it.each([
    ["nome com menos de 3 letras", { cliente: { nome: "Jo", email: "a@b.co", telefone: "85999990000" } }, /nome completo/],
    ["e-mail inválido", { cliente: { nome: "Cliente", email: "sem-arroba", telefone: "85999990000" } }, /e-mail válido/],
    ["WhatsApp sem DDD", { cliente: { nome: "Cliente", email: "a@b.co", telefone: "99990000" } }, /WhatsApp com DDD/],
    ["sem número do endereço", { endereco: { cep: "60060000", numero: "", complemento: "Casa" } }, /número do endereço/],
    ["sem complemento", { endereco: { cep: "60060000", numero: "10", complemento: "" } }, /complemento/],
    ["CEP que não existe", { endereco: { cep: "99999999", numero: "10", complemento: "Casa" } }, /CEP/],
    ["frete fora das opções", { freteId: "frete-inventado" }, /opção de entrega/],
  ])("quando a cliente erra %s, então dá erro 400 com a mensagem do campo e nenhum pedido", async (_caso, extra, mensagem) => {
    const r = await checkout(dadosCheckout([A.slug], extra));
    expect(r.status).toBe(400);
    expect(r.corpo.erro).toMatch(mensagem);
    expect(await pedidosAbertos()).toHaveLength(0);
  });

  it("quando o Mercado Pago falha ao criar o link, então dá erro 502 e o pedido fica cancelado (erro_checkout)", async () => {
    mp.falharPreferencia = true;
    const r = await checkout(dadosCheckout([A.slug]));
    expect(r.status).toBe(502);
    const [pedido] = await sql("select status, pagamento_status from public.pedidos");
    expect(pedido).toEqual({ status: "cancelado", pagamento_status: "erro_checkout" });
  });
});

describe("checkout do site: limites", () => {
  it("quando a sacola tem mais de 5 pares, então dá erro e nenhum pedido", async () => {
    const r = await checkout(dadosCheckout(pares(6).map((p) => p.slug)));
    expect(r.status).toBe(400);
    expect(await pedidosAbertos()).toHaveLength(0);
  });

  it("quando a sacola está vazia, então dá erro e nenhum pedido", async () => {
    const r = await checkout(dadosCheckout([]));
    expect(r.status).toBe(400);
    expect(await pedidosAbertos()).toHaveLength(0);
  });

  it.each(["reservado", "vendido"])("quando o par está %s, então dá erro 409 'acabou de ser reservado' e nenhum pedido novo", async (status) => {
    await sql("insert into public.estoque (slug, status, reservado_ate) values ($1, $2, $3)", [
      A.slug, status, status === "reservado" ? new Date(Date.now() + 3_600_000).toISOString() : null,
    ]);
    const r = await checkout(dadosCheckout([A.slug]));
    expect(r.status).toBe(409);
    expect(r.corpo.erro).toMatch(/acabou de ser reservado/);
    expect(await pedidosAbertos()).toHaveLength(0);
  });

  it("quando a mesma conexão já tem 2 pedidos abertos de e-mails diferentes, então o 3º dá erro 429", async () => {
    await pedidoDoSite([A.slug], { email: "um@teste.espaco35", telefone: "85911111111" }, "10.9.9.9");
    await pedidoDoSite([B.slug], { email: "dois@teste.espaco35", telefone: "85922222222" }, "10.9.9.9");
    const base = dadosCheckout([C.slug]);
    const r = await checkout({ ...base, cliente: { ...base.cliente, email: "tres@teste.espaco35", telefone: "85933333333" } }, "10.9.9.9");
    expect(r.status).toBe(429);
    expect(await pedidosAbertos()).toHaveLength(2);
  });
});

describe("checkout do site: repetição", () => {
  it("quando a mesma cliente (mesmo e-mail) faz um pedido novo, então o anterior dela é cancelado como 'substituido'", async () => {
    const primeiro = await pedidoDoSite([A.slug]);
    const r = await checkout(dadosCheckout([B.slug]));
    expect(r.status).toBe(200);
    expect(await lerPedido(primeiro.id)).toMatchObject({ status: "cancelado", pagamento_status: "substituido" });
    expect(await pedidosAbertos()).toHaveLength(1);
  });

  it("quando o navegador manda 'substituir' com o código do pedido anterior, então o anterior é cancelado", async () => {
    const primeiro = await pedidoDoSite([A.slug], { email: "antes@teste.espaco35", telefone: "85944444444" });
    const r = await checkout(dadosCheckout([B.slug], { substituir: primeiro.codigo }));
    expect(r.status).toBe(200);
    expect((await lerPedido(primeiro.id)).status).toBe("cancelado");
  });

  // Corrida de verdade: as requisições saem juntas e o resultado depende de qual chega antes ao banco. Uma rodada só
  // pode sair "certa" por sorte, então o teste repete e exige o resultado certo em TODAS as rodadas.
  const RODADAS = 5;

  it("quando a cliente clica 2 vezes ao mesmo tempo, então sobra 1 pedido aberto só", async () => {
    const corpo = dadosCheckout([A.slug]);
    const abertos: number[] = [];
    for (let i = 0; i < RODADAS; i++) {
      await limparBanco();
      await Promise.all([checkout(corpo), checkout(corpo)]);
      abertos.push((await pedidosAbertos()).length);
    }
    expect(abertos).toEqual(Array(RODADAS).fill(1));
  });

  it("quando 3 pedidos de e-mails diferentes saem juntos da mesma conexão, então no máximo 2 ficam abertos", async () => {
    const base = dadosCheckout([A.slug]);
    const corpos = ["x1", "x2", "x3"].map((n, i) => ({ ...base, slugs: [pares(3)[i].slug], cliente: { ...base.cliente, email: `${n}@teste.espaco35`, telefone: `8590000000${i}` } }));
    const rodadas: { abertos: number; status: number[] }[] = [];
    for (let i = 0; i < RODADAS; i++) {
      await limparBanco();
      const respostas = await Promise.all(corpos.map((c) => checkout(c, "10.7.7.7")));
      rodadas.push({ abertos: (await pedidosAbertos()).length, status: respostas.map((r) => r.status).sort() });
    }
    expect(rodadas).toEqual(Array(RODADAS).fill({ abertos: 2, status: [200, 200, 429] }));
  });
});

describe("checkout do site: erro não mexe no pedido anterior", () => {
  // pedido anterior da mesma cliente, com o Pix já gerado (pares reservados para ela)
  async function anteriorComPix() {
    const anterior = await pedidoDoSite([A.slug]);
    await pagar(anterior.id, { status: "pending" });
    expect((await situacaoPar(A.slug))?.status).toBe("reservado");
    return anterior;
  }

  it.each([
    ["o CEP é inválido", { endereco: { cep: "99999999", numero: "1", complemento: "Casa" } }],
    ["o frete não existe", { freteId: "frete-inventado" }],
  ])("quando a nova tentativa falha porque %s, então o pedido anterior continua aberto e com o par reservado", async (_caso, extra) => {
    const anterior = await anteriorComPix();
    const r = await checkout(dadosCheckout([B.slug], { ...extra, substituir: anterior.codigo }));
    expect(r.status).toBe(400);
    expect((await lerPedido(anterior.id)).status).toBe("novo");
    expect((await situacaoPar(A.slug))?.status).toBe("reservado");
  });

  it("quando a nova tentativa dá 409 porque o par acabou, então o pedido anterior continua aberto", async () => {
    const anterior = await anteriorComPix();
    await sql("insert into public.estoque (slug, status) values ($1, 'vendido')", [B.slug]);
    const r = await checkout(dadosCheckout([B.slug]));
    expect(r.status).toBe(409);
    expect((await lerPedido(anterior.id)).status).toBe("novo");
    expect((await situacaoPar(A.slug))?.status).toBe("reservado");
  });

  it("quando a nova tentativa dá 502 porque o Mercado Pago falhou, então o pedido anterior continua aberto", async () => {
    const anterior = await anteriorComPix();
    mp.falharPreferencia = true;
    const r = await checkout(dadosCheckout([B.slug]));
    expect(r.status).toBe(502);
    expect((await lerPedido(anterior.id)).status).toBe("novo");
    expect((await situacaoPar(A.slug))?.status).toBe("reservado");
  });
});

describe("checkout do site: acesso indevido", () => {
  it("quando outra pessoa faz checkout com o e-mail de uma cliente que já gerou o Pix, então o pedido dela não é cancelado", async () => {
    const dela = await pedidoDoSite([A.slug], { email: "dela@teste.espaco35", telefone: "85955555555" });
    await pagar(dela.id, { status: "pending" });
    const base = dadosCheckout([B.slug]);
    await checkout({ ...base, cliente: { nome: "Outra Pessoa", email: "dela@teste.espaco35", telefone: "85966666666" } }, "10.5.5.5");
    expect((await lerPedido(dela.id)).status).toBe("novo");
    expect((await situacaoPar(A.slug))?.status).toBe("reservado");
  });

  it("quando outra pessoa faz checkout com o WhatsApp de uma cliente que já gerou o Pix, então o pedido dela não é cancelado", async () => {
    const dela = await pedidoDoSite([A.slug], { email: "dela2@teste.espaco35", telefone: "85977777777" });
    await pagar(dela.id, { status: "pending" });
    const base = dadosCheckout([B.slug]);
    await checkout({ ...base, cliente: { nome: "Outra Pessoa", email: "outra@teste.espaco35", telefone: "(85) 97777-7777" } }, "10.5.5.6");
    expect((await lerPedido(dela.id)).status).toBe("novo");
    expect((await situacaoPar(A.slug))?.status).toBe("reservado");
  });

  it("quando 'substituir' traz o código de um pedido do painel, então nada é cancelado", async () => {
    const [painel] = await sql(
      "insert into public.pedidos (status, origem, cliente_nome, itens, total) values ('novo', 'painel', 'Cliente do WhatsApp', $1, 99.9) returning id, codigo_publico",
      [JSON.stringify([{ slug: C.slug, nome: C.name, codigo: C.code, categoria: C.category, preco: C.price }])],
    );
    await checkout(dadosCheckout([A.slug], { substituir: painel.codigo_publico }));
    expect((await lerPedido(painel.id)).status).toBe("novo");
  });

  it("quando 'substituir' traz o código de um pedido já pago, então nada muda nele", async () => {
    const pago = await pedidoDoSite([A.slug], { email: "pago@teste.espaco35", telefone: "85988888888" });
    await pagar(pago.id, { status: "approved" });
    await checkout(dadosCheckout([B.slug], { substituir: pago.codigo }));
    expect((await lerPedido(pago.id)).status).toBe("pago");
    expect(email.enviados.filter((e) => e.assunto.includes(`#${pago.id}`))).toHaveLength(1);
  });
});
