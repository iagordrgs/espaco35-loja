import Link from "next/link";
import { categories, products } from "@/data/products";
import { situacaoAtual, type MapaEstoque } from "@/lib/estoque-regras";
import { ROTULO_STATUS, STATUS_VENDA, agoraMs, dataHora, reais, type LinhaEstoque, type Pedido } from "@/lib/painel";
import { exigirUsuario } from "@/lib/supabase/server";

const PERIODOS = {
  "7d": { rotulo: "7 dias", dias: 7 },
  "30d": { rotulo: "30 dias", dias: 30 },
  "90d": { rotulo: "90 dias", dias: 90 },
  tudo: { rotulo: "Tudo", dias: null },
} as const;
type Periodo = keyof typeof PERIODOS;

type Barra = { rotulo: string; valor: number; detalhe: string };

function Barras({ titulo, linhas, vazio }: { titulo: string; linhas: Barra[]; vazio: string }) {
  const maior = Math.max(...linhas.map((l) => l.valor), 0);
  return (
    <section className="painel-bloco">
      <h2>{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="painel-sub">{vazio}</p>
      ) : (
        <ul className="painel-barras">
          {linhas.map((l) => (
            <li key={l.rotulo} title={`${l.rotulo}: ${l.detalhe}`}>
              <span className="painel-barras-rotulo">{l.rotulo}</span>
              <span className="painel-barras-trilho" aria-hidden="true">
                <span style={{ width: `${maior ? Math.max((l.valor / maior) * 100, 2) : 0}%` }} />
              </span>
              <span className="painel-barras-valor">{l.detalhe}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function agrupar(pedidos: Pedido[], chave: (p: Pedido) => string[]): Barra[] {
  const somas = new Map<string, { total: number; pares: number }>();
  for (const p of pedidos) {
    for (const k of chave(p)) {
      const atual = somas.get(k) ?? { total: 0, pares: 0 };
      somas.set(k, { total: atual.total + Number(p.total), pares: atual.pares + p.itens.length });
    }
  }
  return [...somas.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .map(([rotulo, v]) => ({ rotulo, valor: v.total, detalhe: `${reais(v.total)} · ${v.pares} ${v.pares === 1 ? "par" : "pares"}` }));
}

export default async function ResumoPage({ searchParams }: { searchParams: Promise<{ periodo?: string }> }) {
  const { supabase } = await exigirUsuario();
  await supabase.rpc("cancelar_expirados");
  const { periodo: bruto } = await searchParams;
  const periodo: Periodo = bruto && bruto in PERIODOS ? (bruto as Periodo) : "30d";
  const dias = PERIODOS[periodo].dias;
  const desde = dias ? new Date(agoraMs() - dias * 86_400_000).toISOString() : null;

  // busca o período escolhido ou os últimos 6 meses (para o gráfico mensal), o que for maior
  const seisMeses = new Date();
  seisMeses.setDate(1);
  seisMeses.setHours(0, 0, 0, 0);
  seisMeses.setMonth(seisMeses.getMonth() - 5);
  const inicioBusca = desde && desde < seisMeses.toISOString() ? desde : desde ? seisMeses.toISOString() : null;

  let consulta = supabase.from("pedidos").select("*").order("criado_em", { ascending: false });
  if (inicioBusca) consulta = consulta.gte("criado_em", inicioBusca);
  const [{ data: dadosPedidos, error }, { data: dadosEstoque }] = await Promise.all([
    consulta,
    supabase.from("estoque").select("slug,status,reservado_ate,pedido_id"),
  ]);
  if (error) throw new Error(error.message);

  const todos = dadosPedidos as Pedido[];
  const vendasTendencia = todos.filter((p) => STATUS_VENDA.includes(p.status));
  const pedidos = desde ? todos.filter((p) => p.criado_em >= desde) : todos;
  const vendas = pedidos.filter((p) => STATUS_VENDA.includes(p.status));
  const abertos = pedidos.filter((p) => p.status === "novo");
  const faturamento = vendas.reduce((s, p) => s + Number(p.total), 0);
  const paresVendidos = vendas.reduce((s, p) => s + p.itens.length, 0);
  const ticket = vendas.length ? faturamento / vendas.length : 0;

  // estoque de agora (não depende do período)
  const mapa: MapaEstoque = Object.fromEntries(
    ((dadosEstoque ?? []) as LinhaEstoque[]).filter((l) => l.status !== "disponivel").map((l) => [l.slug, { status: l.status as "reservado" | "vendido", ate: l.reservado_ate }]),
  );
  const agora = agoraMs();
  const situacoes = products.map((p) => (p.soldOut ? "vendido" : situacaoAtual(mapa, p.slug, agora)));
  const disponiveis = situacoes.filter((s) => s === "disponivel").length;
  const reservados = situacoes.filter((s) => s === "reservado").length;
  const valorEmEstoque = products.reduce((s, p, i) => s + (situacoes[i] === "disponivel" ? p.price ?? 0 : 0), 0);

  const nomeCategoria = (chave: string) => categories.find((c) => c.key === chave)?.label ?? chave;
  const porCategoria = agrupar(vendas, (p) => [...new Set(p.itens.map((i) => nomeCategoria(i.categoria)))]);
  const porVendedor = agrupar(vendas, (p) => [p.vendedor || "Sem vendedor"]);
  const porPagamento = agrupar(vendas, (p) => [p.pagamento || "Não informado"]);

  // vendas por mês, últimos 6 meses (sempre, para dar a tendência)
  const meses: Barra[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    const chave = `${d.getFullYear()}-${d.getMonth()}`;
    const doMes = vendasTendencia.filter((p) => { const c = new Date(p.criado_em); return `${c.getFullYear()}-${c.getMonth()}` === chave; });
    const total = doMes.reduce((s, p) => s + Number(p.total), 0);
    meses.push({ rotulo: `${d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "")}/${String(d.getFullYear()).slice(2)}`, valor: total, detalhe: `${reais(total)} · ${doMes.length} ${doMes.length === 1 ? "pedido" : "pedidos"}` });
  }

  return (
    <div className="painel-pagina">
      <header className="painel-cabecalho">
        <div>
          <h1>Resumo</h1>
          <p>Vendas contam pedidos pagos, enviados e entregues.</p>
        </div>
        <nav className="painel-abas" aria-label="Período">
          {(Object.keys(PERIODOS) as Periodo[]).map((p) => (
            <Link key={p} href={`/painel?periodo=${p}`} className={p === periodo ? "is-active" : undefined}>{PERIODOS[p].rotulo}</Link>
          ))}
        </nav>
      </header>

      <div className="painel-cartoes">
        <div className="painel-cartao destaque"><span>Faturamento</span><strong>{reais(faturamento)}</strong><small>{vendas.length} {vendas.length === 1 ? "venda" : "vendas"}</small></div>
        <div className="painel-cartao"><span>Pares vendidos</span><strong>{paresVendidos}</strong><small>ticket médio {reais(ticket)}</small></div>
        <div className="painel-cartao"><span>Aguardando pagamento</span><strong>{abertos.length}</strong><small>{reais(abertos.reduce((s, p) => s + Number(p.total), 0))} em aberto</small></div>
        <div className="painel-cartao"><span>Em estoque agora</span><strong>{disponiveis}</strong><small>{reservados} reservados · {reais(valorEmEstoque)}</small></div>
      </div>

      <div className="painel-grade-relatorios">
        <Barras titulo="Vendas por mês" linhas={meses} vazio="" />
        <Barras titulo="Por categoria" linhas={porCategoria} vazio="Nenhuma venda no período." />
        <Barras titulo="Por vendedor(a)" linhas={porVendedor} vazio="Nenhuma venda no período." />
        <Barras titulo="Por forma de pagamento" linhas={porPagamento} vazio="Nenhuma venda no período." />
      </div>

      <section className="painel-bloco">
        <div className="painel-bloco-topo">
          <h2>Últimos pedidos</h2>
          <Link className="painel-link" href="/painel/pedidos">Ver todos →</Link>
        </div>
        {pedidos.length === 0 ? (
          <p className="painel-sub">Nenhum pedido no período. <Link className="painel-link" href="/painel/pedidos/novo">Registrar o primeiro</Link></p>
        ) : (
          <ul className="painel-recentes">
            {pedidos.slice(0, 6).map((p) => (
              <li key={p.id}>
                <Link href={`/painel/pedidos/${p.id}`}>
                  <strong>#{p.id} · {p.cliente_nome}</strong>
                  <small>{dataHora(p.criado_em)} · {p.itens.length} {p.itens.length === 1 ? "par" : "pares"}</small>
                  <span>{reais(p.total)}</span>
                  <span className={`painel-status status-${p.status}`}>{ROTULO_STATUS[p.status].split(" ·")[0]}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
