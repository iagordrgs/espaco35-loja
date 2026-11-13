import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { ATACADO_MINIMO } from "@/data/products";
import { mp } from "./apoio/externos";
import {
  DE_FORA, EQUIPE, SENHA, aviso, comRedirect, entrarComo, formulario, garantirUsuario, lerPedido, limparBanco, pagar, pares, pedidoDoPainel,
  pedidoDoSite, sair, situacaoPar, sql,
} from "./apoio/loja";
import { sessao } from "./apoio/sessao";

const acoes = () => import("@/app/painel/actions");
const [A, B] = pares(2, "sandalias");

beforeAll(async () => {
  await garantirUsuario(EQUIPE, true);
  await garantirUsuario(DE_FORA, false);
});
beforeEach(limparBanco);

async function naEquipe() {
  const r = await entrarComo(EQUIPE);
  expect(r.redirect).toBe("/painel");
}

// cria um pedido pelo formulário do painel e devolve o id (a ação redireciona para /painel/pedidos/<id>)
async function criarPeloPainel(campos: Record<string, string | string[]>) {
  const { criarPedido } = await acoes();
  const r = await comRedirect(() => criarPedido({}, formulario(campos)));
  const id = r.redirect?.match(/^\/painel\/pedidos\/(\d+)$/)?.[1];
  return { id: id ? Number(id) : null, redirect: r.redirect, erro: (r.resultado as { erro?: string } | undefined)?.erro, excecao: r.erro };
}

describe("painel: login", () => {
  it("quando alguém da equipe entra com a senha certa, então vai para o painel", async () => {
    await naEquipe();
    expect([...sessao.cookies.keys()].some((k) => k.includes("auth-token"))).toBe(true);
  });

  it("quando a senha está errada, então aparece 'E-mail ou senha incorretos'", async () => {
    const r = await entrarComo(EQUIPE, "senha-errada");
    expect(r.resultado).toEqual({ erro: "E-mail ou senha incorretos." });
  });

  it("quando a pessoa tem conta mas não está na equipe, então é tirada na hora e vê o aviso de sem acesso", async () => {
    const r = await entrarComo(DE_FORA);
    expect((r.resultado as { erro: string }).erro).toMatch(/não tem acesso/);
    expect([...sessao.cookies.keys()].some((k) => k.includes("auth-token"))).toBe(false);
  });
});

describe("painel: acesso indevido às ações", () => {
  beforeEach(sair);

  it("quando ninguém entrou, então criar pedido manda para o login e não grava nada", async () => {
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana" });
    expect(r.redirect).toBe("/painel/login");
    expect(r.id).toBeNull();
    expect(await sql("select id from public.pedidos")).toHaveLength(0);
  });

  it("quando ninguém entrou, então mudar estoque, pedido e rastreio manda para o login e não grava nada", async () => {
    const { id } = await pedidoDoPainel([A]);
    const { definirEstoque, atualizarPedido, salvarRastreio, gerarLinkPagamento } = await acoes();
    for (const acao of [
      () => definirEstoque(formulario({ slug: B.slug, status: "vendido" })),
      () => atualizarPedido(formulario({ id: String(id), status: "cancelado" })),
      () => salvarRastreio(formulario({ id: String(id), rastreio: "BR123" })),
      () => gerarLinkPagamento(formulario({ id: String(id) })),
    ]) {
      expect((await comRedirect(acao)).redirect).toBe("/painel/login");
    }
    expect(await lerPedido(id)).toMatchObject({ status: "novo", rastreio: null, link_pagamento: null });
    expect((await situacaoPar(B.slug))?.status ?? "disponivel").toBe("disponivel");
  });

  it("quando quem entrou não é da equipe, então as ações mandam para o login com acesso negado", async () => {
    const { supabaseServidor } = await import("@/lib/supabase/server");
    const { error } = await (await supabaseServidor()).auth.signInWithPassword({ email: DE_FORA, password: SENHA });
    expect(error).toBeNull();
    expect([...sessao.cookies.keys()].some((k) => k.includes("auth-token"))).toBe(true); // entrou de verdade
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana" });
    expect(r.redirect).toBe("/painel/login?acesso=negado");
    expect(r.id).toBeNull();
    expect(await sql("select id from public.pedidos")).toHaveLength(0);
  });
});

describe("painel: criar pedido", () => {
  beforeEach(naEquipe);

  it("quando a equipe cria um pedido, então o preço é o do catálogo e o par fica reservado", async () => {
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana", preco: "1", total: "1" });
    const pedido = await lerPedido(r.id!);
    expect(Number(pedido.total)).toBe(A.price);
    expect(await situacaoPar(A.slug)).toMatchObject({ status: "reservado", pedido_id: r.id });
  });

  it("quando a equipe cria o pedido já como pago, então o par vira vendido na hora", async () => {
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana", status: "pago" });
    expect(await situacaoPar(A.slug)).toMatchObject({ status: "vendido", pedido_id: r.id });
  });

  it("quando o atacado tem menos pares que o mínimo, então dá erro e nada é criado", async () => {
    const r = await criarPeloPainel({ pares: pares(ATACADO_MINIMO - 1).map((p) => p.slug), cliente_nome: "Loja X", tipo: "atacado" });
    expect(r.erro).toMatch(/Atacado vale a partir/);
    expect(await sql("select id from public.pedidos")).toHaveLength(0);
  });

  it("quando o atacado tem o mínimo de pares, então usa a tabela de atacado", async () => {
    const lista = pares(ATACADO_MINIMO);
    const r = await criarPeloPainel({ pares: lista.map((p) => p.slug), cliente_nome: "Loja X", tipo: "atacado" });
    const pedido = await lerPedido(r.id!);
    expect(pedido.itens.every((i: { tabela: string }) => i.tabela === "atacado")).toBe(true);
    expect(Number(pedido.subtotal)).toBeLessThan(lista.reduce((s, p) => s + p.price!, 0));
  });

  it("quando o desconto é maior que o subtotal, então fica limitado ao subtotal", async () => {
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana", desconto: "1000" });
    const pedido = await lerPedido(r.id!);
    expect(Number(pedido.desconto)).toBe(A.price);
    expect(Number(pedido.total)).toBe(0);
  });

  it("quando o frete ou o desconto vêm negativos, então viram zero", async () => {
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana", frete: "-15", desconto: "-10" });
    const pedido = await lerPedido(r.id!);
    expect(Number(pedido.frete)).toBe(0);
    expect(Number(pedido.desconto)).toBe(0);
  });

  it.each([
    ["15,90", 15.9],
    ["15.90", 15.9],
    ["1.234,50", 1234.5],
  ])("quando a equipe digita o frete '%s', então grava R$ %s", async (digitado, valor) => {
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana", frete: digitado });
    expect(Number((await lerPedido(r.id!)).frete)).toBe(valor);
  });

  it("quando o par já está em outro pedido, então dá erro e nada é criado", async () => {
    await pedidoDoPainel([A]);
    const r = await criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana" });
    expect(r.erro).toMatch(/Par indisponível/);
    expect(await sql("select id from public.pedidos")).toHaveLength(1);
  });

  it("quando a vendedora clica 2 vezes ao mesmo tempo em criar pedido com o mesmo par, então nasce 1 pedido só", async () => {
    for (let i = 0; i < 5; i++) {
      await limparBanco();
      await Promise.all([criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana" }), criarPeloPainel({ pares: A.slug, cliente_nome: "Fulana" })]);
      expect(await sql("select id from public.pedidos")).toHaveLength(1);
    }
  });
});

describe("painel: mudar a situação do pedido", () => {
  beforeEach(naEquipe);
  const mudar = async (id: number, status: string) => {
    const { atualizarPedido } = await acoes();
    return comRedirect(() => atualizarPedido(formulario({ id: String(id), status })));
  };

  it("quando a equipe marca como enviado um pedido do site sem pagamento aprovado, então dá o erro 'Não envie'", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const r = await mudar(id, "enviado");
    expect(String((r.erro as Error)?.message)).toMatch(/Não envie/);
    expect((await lerPedido(id)).status).toBe("novo");
  });

  it("quando a equipe cancela um pedido, então os pares voltam à venda", async () => {
    const { id } = await pedidoDoPainel([A]);
    await mudar(id, "cancelado");
    expect((await situacaoPar(A.slug))?.status).toBe("disponivel");
  });

  it("quando a equipe reabre um pedido cujo par já foi para outro, então dá erro", async () => {
    const primeiro = await pedidoDoPainel([A]);
    await mudar(primeiro.id, "cancelado");
    await pedidoDoPainel([A]);
    const r = await mudar(primeiro.id, "novo");
    expect(String((r.erro as Error)?.message)).toMatch(/já foi para outro pedido/);
  });

  it("quando um pedido pago volta para 'novo', então a mudança é recusada ou o par volta a ter prazo para sair da reserva", async () => {
    const { id } = await pedidoDoPainel([A], { status: "pago" });
    const r = await mudar(id, "novo");
    if (r.erro) {
      // recusar é certo, desde que seja pela regra (e não um erro qualquer)
      expect(String((r.erro as Error).message)).toMatch(/pago/i);
      return;
    }
    // aceitou: a reserva tem de ter prazo (no pedido e no par), senão o par nunca volta à venda.
    // (não dá para usar vencer() aqui: ele mesmo poria um prazo no par e esconderia o problema)
    const pedido = await lerPedido(id);
    const par = await situacaoPar(A.slug);
    expect(pedido.expira_em).not.toBeNull();
    expect(par?.reservado_ate ?? null).not.toBeNull();
  });

  it("quando o pagamento de um pedido do painel foi estornado, então a equipe não consegue marcar como enviado", async () => {
    const { id } = await pedidoDoPainel([A]);
    const { idPagamento } = await pagar(id, { status: "approved" });
    mp.pagamentos.get(idPagamento)!.status = "refunded";
    await aviso(idPagamento);
    expect((await lerPedido(id)).observacoes).toMatch(/NÃO ENVIAR/);
    const r = await mudar(id, "enviado");
    expect(String((r.erro as Error | undefined)?.message ?? "")).toMatch(/Não envie|NÃO ENVIAR|estorn/i);
    expect((await lerPedido(id)).status).toBe("pago");
  });
});

describe("painel: estoque manual", () => {
  beforeEach(naEquipe);

  it("quando a equipe muda à mão um par preso a um pedido, então dá erro", async () => {
    await pedidoDoPainel([A]);
    const { definirEstoque } = await acoes();
    const r = await comRedirect(() => definirEstoque(formulario({ slug: A.slug, status: "disponivel" })));
    expect(String((r.erro as Error)?.message)).toMatch(/preso a um pedido/);
  });

  it("quando a equipe reserva um par por horas negativas, então dá erro (e o par não aparece reservado estando livre)", async () => {
    const { definirEstoque } = await acoes();
    const r = await comRedirect(() => definirEstoque(formulario({ slug: A.slug, status: "reservado", horas: "-5" })));
    const par = await situacaoPar(A.slug);
    const reservaNoPassado = par?.status === "reservado" && new Date(par.reservado_ate!).getTime() < Date.now();
    expect(Boolean(r.erro) && !reservaNoPassado).toBe(true);
  });
});

describe("painel: link de pagamento", () => {
  beforeEach(naEquipe);
  const gerar = async (id: number) => {
    const { gerarLinkPagamento } = await acoes();
    return comRedirect(() => gerarLinkPagamento(formulario({ id: String(id) })));
  };

  it("quando a equipe gera o link de um pedido do painel ainda novo, então o link fica salvo no pedido", async () => {
    const { id } = await pedidoDoPainel([A]);
    const r = await gerar(id);
    expect(r.redirect).toBe(`/painel/pedidos/${id}`);
    expect((await lerPedido(id)).link_pagamento).toMatch(/^https:\/\/mp\.teste\/pagar\//);
    expect(mp.preferencias[0].corpo.external_reference).toBe(String(id));
  });

  it("quando o pedido é do site ou já foi pago, então nenhum link é gerado", async () => {
    const site = await pedidoDoSite([A.slug]);
    const pago = await pedidoDoPainel([B], { status: "pago" });
    mp.chamadas = 0;
    for (const id of [site.id, pago.id]) {
      const r = await gerar(id);
      expect(r).toEqual({ redirect: `/painel/pedidos/${id}` });
      expect((await lerPedido(id)).link_pagamento).toBeNull();
    }
    expect(mp.chamadas).toBe(0);
  });

  it("quando o pedido tem total R$ 0, então nenhum link é pedido ao Mercado Pago e a equipe vê o motivo", async () => {
    const { id } = await pedidoDoPainel([A], { desconto: A.price, total: 0 });
    mp.chamadas = 0;
    const r = await gerar(id);
    expect(mp.chamadas).toBe(0);
    expect(String((r.erro as Error)?.message ?? "")).toMatch(/R\$ 0|total (é )?zero|total zerado/i);
  });
});
