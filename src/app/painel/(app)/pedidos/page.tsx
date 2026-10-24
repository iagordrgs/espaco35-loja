import Link from "next/link";
import { exigirUsuario } from "@/lib/supabase/server";
import { ROTULO_STATUS, STATUS_PEDIDO, dataHora, reais, type Pedido, type StatusPedido } from "@/lib/painel";

export default async function PedidosPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { supabase } = await exigirUsuario();
  const { status, q } = await searchParams;
  const filtro = STATUS_PEDIDO.includes(status as StatusPedido) ? (status as StatusPedido) : undefined;

  let consulta = supabase.from("pedidos").select("*").order("criado_em", { ascending: false }).limit(300);
  if (filtro) consulta = consulta.eq("status", filtro);
  if (q) consulta = consulta.ilike("cliente_nome", `%${q.replace(/[%_,()]/g, "")}%`);
  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  const pedidos = data as Pedido[];

  const link = (s?: string) => `/painel/pedidos${s ? `?status=${s}` : ""}`;

  return (
    <div className="painel-pagina">
      <header className="painel-cabecalho">
        <div>
          <h1>Pedidos</h1>
          <p>{pedidos.length} {pedidos.length === 1 ? "pedido" : "pedidos"}{filtro ? ` · ${ROTULO_STATUS[filtro]}` : ""}</p>
        </div>
        <Link href="/painel/pedidos/novo" className="button button-red">Novo pedido +</Link>
      </header>

      <div className="painel-filtros">
        <form className="painel-busca">
          {filtro && <input type="hidden" name="status" value={filtro} />}
          <input type="search" name="q" defaultValue={q} placeholder="Buscar pelo nome da cliente" aria-label="Buscar pedido" />
        </form>
        <nav className="painel-abas" aria-label="Filtrar por situação">
          <Link href={link()} className={!filtro ? "is-active" : undefined}>Todos</Link>
          {STATUS_PEDIDO.map((s) => (
            <Link key={s} href={link(s)} className={filtro === s ? "is-active" : undefined}>{ROTULO_STATUS[s].split(" ·")[0]}</Link>
          ))}
        </nav>
      </div>

      <div className="painel-tabela-wrap">
        <table className="painel-tabela">
          <thead>
            <tr><th>Pedido</th><th>Cliente</th><th>Pares</th><th>Total</th><th>Vendedor</th><th>Situação</th></tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id}>
                <td><Link className="painel-link" href={`/painel/pedidos/${p.id}`}><strong>#{p.id}</strong></Link><small className="painel-sub">{dataHora(p.criado_em)}</small></td>
                <td>{p.cliente_nome}<small className="painel-sub">{p.cliente_cidade}</small></td>
                <td>{p.itens.map((i) => i.nome).join(", ")}</td>
                <td>{reais(p.total)}<small className="painel-sub">{p.pagamento}</small></td>
                <td>{p.vendedor || "—"}</td>
                <td><span className={`painel-status status-${p.status}`}>{ROTULO_STATUS[p.status].split(" ·")[0]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {pedidos.length === 0 && <p className="painel-nada">Nenhum pedido por aqui ainda.</p>}
      </div>
    </div>
  );
}
