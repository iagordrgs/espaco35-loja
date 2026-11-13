import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DE_FORA, EQUIPE, anonimo, clienteLogado, garantirUsuario, lerPedido, limparBanco, pares, pedidoDoPainel, pedidoDoSite, sql } from "./apoio/loja";

// A chave pública do Supabase fica no navegador: qualquer pessoa pode usá-la direto, sem passar pelo site.
// Estes testes fazem o que essa pessoa faria e conferem que o banco segura.

const [A] = pares(1, "sandalias");
let idDeFora = "";

beforeAll(async () => {
  await garantirUsuario(EQUIPE, true);
  idDeFora = await garantirUsuario(DE_FORA, false);
});
beforeEach(limparBanco);

const FUNCOES = [
  ["confirmar_pagamento", { pedido: 1, id_pagamento: "1", valor: 1000 }],
  ["reservar_pedido", { pedido: 1 }],
  ["cancelar_pedido_site", { pedido: 1, situacao: "rejected" }],
  ["registrar_estorno", { pedido: 1, situacao: "refunded", id_pagamento: "1" }],
  ["criar_pedido", { dados: { status: "pago", itens: [{ slug: "x" }] } }],
  ["atualizar_pedido", { pedido: 1, novo_status: "pago" }],
  ["definir_estoque", { par: "x", novo_status: "vendido" }],
  ["cancelar_expirados", {}],
] as const;

describe("anônimo com a chave pública", () => {
  it("quando lê o estoque, então vê só par, situação e prazo (não vê de qual pedido é)", async () => {
    await pedidoDoPainel([A]);
    const c = anonimo();
    const { data } = await c.from("estoque").select("slug,status,reservado_ate");
    expect(data).toHaveLength(1);
    const { error } = await c.from("estoque").select("pedido_id");
    expect(error).not.toBeNull();
  });

  it("quando tenta ler pedidos ou a lista da equipe, então não vem nada", async () => {
    await pedidoDoSite([A.slug]);
    const c = anonimo();
    for (const tabela of ["pedidos", "equipe"]) {
      const { data } = await c.from(tabela).select("*");
      expect(data ?? []).toHaveLength(0);
    }
  });

  it("quando tenta gravar em estoque, pedidos ou equipe, então nada é gravado", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const c = anonimo();
    await c.from("estoque").insert({ slug: A.slug, status: "vendido" });
    await c.from("pedidos").insert({ status: "pago", cliente_nome: "x", itens: [] });
    await c.from("pedidos").update({ status: "pago" }).eq("id", id);
    await c.from("pedidos").delete().eq("id", id);
    await c.from("equipe").insert({ user_id: idDeFora });
    expect(await sql("select slug from public.estoque where status = 'vendido'")).toHaveLength(0);
    expect(await sql("select id from public.pedidos")).toHaveLength(1);
    expect((await lerPedido(id)).status).toBe("novo");
    expect(await sql("select user_id from public.equipe where user_id = $1", [idDeFora])).toHaveLength(0);
  });

  it.each(FUNCOES)("quando chama a função %s, então é recusado", async (funcao, args) => {
    const { error } = await anonimo().rpc(funcao, args);
    expect(error?.code).toBe("42501"); // permissão negada (e não um erro qualquer)
  });
});

describe("usuário logado que não é da equipe", () => {
  it("quando tenta ler pedidos, então não vem nada", async () => {
    await pedidoDoSite([A.slug]);
    const c = await clienteLogado(DE_FORA);
    const { data } = await c.from("pedidos").select("*");
    expect(data ?? []).toHaveLength(0);
  });

  it("quando tenta gravar no estoque ou mudar um pedido, então nada é gravado", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const c = await clienteLogado(DE_FORA);
    await c.from("estoque").upsert({ slug: A.slug, status: "vendido" });
    await c.from("pedidos").update({ status: "pago" }).eq("id", id);
    await c.rpc("definir_estoque", { par: A.slug, novo_status: "vendido" });
    await c.rpc("atualizar_pedido", { pedido: id, novo_status: "cancelado" });
    expect(await sql("select slug from public.estoque where status = 'vendido'")).toHaveLength(0);
    expect((await lerPedido(id)).status).toBe("novo");
  });

  it("quando tenta se incluir na equipe, então é recusado e continua sem acesso", async () => {
    const c = await clienteLogado(DE_FORA);
    await c.from("equipe").insert({ user_id: idDeFora });
    await c.from("equipe").upsert({ user_id: idDeFora });
    expect(await sql("select user_id from public.equipe where user_id = $1", [idDeFora])).toHaveLength(0);
  });

  it.each(FUNCOES.filter(([f]) => ["confirmar_pagamento", "reservar_pedido", "cancelar_pedido_site", "registrar_estorno"].includes(f)))(
    "quando chama a função de pagamento %s, então é recusado",
    async (funcao, args) => {
      const { error } = await (await clienteLogado(DE_FORA)).rpc(funcao, args);
      expect(error?.code).toBe("42501"); // permissão negada
    },
  );
});

describe("membro da equipe direto no banco (fora do painel)", () => {
  it("quando tenta marcar como pago um pedido do site sem pagamento aprovado, então o banco recusa", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const c = await clienteLogado(EQUIPE);
    await c.from("pedidos").update({ status: "pago" }).eq("id", id);
    expect((await lerPedido(id)).status).toBe("novo");
  });

  it("quando tenta marcar como aprovado o pagamento de um pedido do site, então o banco recusa", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const c = await clienteLogado(EQUIPE);
    await c.from("pedidos").update({ pagamento_status: "approved", status: "enviado" }).eq("id", id);
    expect(await lerPedido(id)).toMatchObject({ status: "novo", pagamento_status: null });
  });

  it("quando tenta trocar a origem do pedido do site para 'painel' e depois marcar pago, então o banco recusa", async () => {
    const { id } = await pedidoDoSite([A.slug]);
    const c = await clienteLogado(EQUIPE);
    await c.from("pedidos").update({ origem: "painel" }).eq("id", id);
    await c.rpc("atualizar_pedido", { pedido: id, novo_status: "pago" });
    expect(await lerPedido(id)).toMatchObject({ origem: "site", status: "novo" });
  });
});
