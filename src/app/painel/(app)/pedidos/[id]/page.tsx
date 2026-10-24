import Link from "next/link";
import { notFound } from "next/navigation";
import { atualizarPedido } from "@/app/painel/actions";
import { exigirUsuario } from "@/lib/supabase/server";
import { ROTULO_STATUS, dataHora, reais, whatsCliente, type Pedido, type StatusPedido } from "@/lib/painel";

// Próximos passos possíveis a partir de cada situação.
const PROXIMOS: Record<StatusPedido, StatusPedido[]> = {
  novo: ["pago", "cancelado"],
  pago: ["enviado", "entregue", "cancelado"],
  enviado: ["entregue", "cancelado"],
  entregue: ["cancelado"],
  cancelado: ["novo"],
};

const ROTULO_BOTAO: Record<StatusPedido, string> = {
  novo: "Reabrir pedido",
  pago: "Marcar como pago",
  enviado: "Marcar como enviado",
  entregue: "Marcar como entregue",
  cancelado: "Cancelar e devolver ao estoque",
};

export default async function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { supabase } = await exigirUsuario();
  const { id } = await params;
  const { data } = await supabase.from("pedidos").select("*").eq("id", Number(id)).maybeSingle();
  if (!data) notFound();
  const pedido = data as Pedido;
  const whats = whatsCliente(pedido.cliente_telefone);

  return (
    <div className="painel-pagina">
      <Link href="/painel/pedidos" className="painel-voltar">← Pedidos</Link>
      <header className="painel-cabecalho">
        <div>
          <h1>Pedido #{pedido.id}</h1>
          <p>{dataHora(pedido.criado_em)}{pedido.vendedor ? ` · atendido por ${pedido.vendedor}` : ""}</p>
        </div>
        <span className={`painel-status status-${pedido.status} grande`}>{ROTULO_STATUS[pedido.status]}</span>
      </header>

      <div className="painel-detalhe">
        <section className="painel-bloco">
          <h2>Pares</h2>
          <ul className="painel-itens">
            {pedido.itens.map((item) => (
              <li key={item.slug}>
                <Link className="painel-link" href={`/produtos/${item.slug}`} target="_blank">{item.nome}</Link>
                <small>{item.codigo}{item.tabela === "atacado" ? " · atacado" : ""}</small>
                <span>{reais(item.preco)}</span>
              </li>
            ))}
          </ul>
          <dl className="painel-totais">
            <div><dt>Subtotal</dt><dd>{reais(pedido.subtotal)}</dd></div>
            {Number(pedido.desconto) > 0 && <div><dt>Desconto</dt><dd>− {reais(pedido.desconto)}</dd></div>}
            <div><dt>Frete</dt><dd>{reais(pedido.frete)}</dd></div>
            <div className="total"><dt>Total</dt><dd>{reais(pedido.total)}</dd></div>
          </dl>
        </section>

        <aside className="painel-bloco">
          <h2>Cliente</h2>
          <p><strong>{pedido.cliente_nome}</strong></p>
          {pedido.cliente_telefone && <p>{pedido.cliente_telefone}{whats && <> · <a className="painel-link" href={whats} target="_blank" rel="noopener noreferrer">abrir conversa ↗</a></>}</p>}
          {pedido.cliente_cidade && <p>{pedido.cliente_cidade}</p>}
          <h2>Pagamento e entrega</h2>
          <p>{pedido.pagamento || "—"} · {pedido.entrega || "—"}</p>
          {pedido.observacoes && <><h2>Observações</h2><p className="painel-obs">{pedido.observacoes}</p></>}

          <h2>Atualizar situação</h2>
          <div className="painel-acoes coluna">
            {PROXIMOS[pedido.status].map((s) => (
              <form key={s} action={atualizarPedido}>
                <input type="hidden" name="id" value={pedido.id} />
                <input type="hidden" name="status" value={s} />
                <button type="submit" className={`painel-botao ${s === "cancelado" ? "perigo" : "principal"}`}>{ROTULO_BOTAO[s]}</button>
              </form>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
