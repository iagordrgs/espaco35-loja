import Link from "next/link";
import { notFound } from "next/navigation";
import { atualizarPedido, salvarRastreio } from "@/app/painel/actions";
import { exigirUsuario } from "@/lib/supabase/server";
import { ROTULO_STATUS, agoraMs, dataHora, reais, whatsCliente, type Pedido, type StatusPedido } from "@/lib/painel";

// Mensagem pronta para a cliente quando o pedido sai (abre no WhatsApp da loja).
function mensagemEnviado(p: Pedido) {
  const pares = p.itens.map((i) => i.nome).join(", ");
  const retirada = /retira/i.test(p.entrega ?? "");
  if (retirada) return `Oi, ${p.cliente_nome.split(" ")[0]}! Seu pedido #${p.id} (${pares}) já está separado para retirada. Vamos combinar dia, hora e local? 🤍`;
  const rastreio = p.rastreio ? ` Código de rastreio: ${p.rastreio}.` : "";
  return `Oi, ${p.cliente_nome.split(" ")[0]}! Seu pedido #${p.id} (${pares}) foi enviado 📦${rastreio} Qualquer dúvida é só chamar. Equipe Espaço 35 🤍`;
}

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
  const agora = agoraMs();

  return (
    <div className="painel-pagina">
      <Link href="/painel/pedidos" className="painel-voltar">← Pedidos</Link>
      <header className="painel-cabecalho">
        <div>
          <h1>Pedido #{pedido.id}</h1>
          <p>{dataHora(pedido.criado_em)}{pedido.origem === "site" ? " · comprado pelo site" : pedido.vendedor ? ` · atendido por ${pedido.vendedor}` : ""}</p>
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
          {pedido.cliente_email && <p>{pedido.cliente_email}</p>}
          {pedido.endereco ? (
            <>
              <h2>Enviar para</h2>
              <p className="painel-obs">{`${pedido.endereco.rua ?? ""}, ${pedido.endereco.numero ?? ""}${pedido.endereco.complemento ? ` · ${pedido.endereco.complemento}` : ""}
${pedido.endereco.bairro ?? ""} · ${pedido.endereco.cidade ?? ""} - ${pedido.endereco.uf ?? ""}
CEP ${pedido.endereco.cep ?? ""}`}</p>
            </>
          ) : pedido.cliente_cidade && <p>{pedido.cliente_cidade}</p>}
          <h2>Pagamento e entrega</h2>
          <p>{pedido.pagamento || "—"} · {pedido.entrega || "—"}</p>
          {pedido.origem === "site" && (
            <p className="painel-sub">
              {pedido.pagamento_id ? `Mercado Pago #${pedido.pagamento_id} · ${pedido.pagamento_status ?? ""}` : "Aguardando pagamento no Mercado Pago"}
            </p>
          )}
          {pedido.status === "novo" && pedido.expira_em && (
            <p className="painel-sub">
              {new Date(pedido.expira_em).getTime() < agora ? `Reserva venceu em ${dataHora(pedido.expira_em)}: o par voltou à vitrine. Confira antes de marcar como pago.` : `Par reservado até ${dataHora(pedido.expira_em)}`}
            </p>
          )}

          <h2>Envio</h2>
          <form action={salvarRastreio} className="painel-rastreio">
            <input type="hidden" name="id" value={pedido.id} />
            <label>Código de rastreio ou como foi entregue
              <input name="rastreio" defaultValue={pedido.rastreio ?? ""} placeholder="Ex.: AB123456789BR, Uber Flash, retirado na loja" maxLength={120} />
            </label>
            <button type="submit" className="painel-botao">Salvar</button>
          </form>
          {whats && ["pago", "enviado", "entregue"].includes(pedido.status) && (
            <a className="painel-link" href={`${whats}?text=${encodeURIComponent(mensagemEnviado(pedido))}`} target="_blank" rel="noopener noreferrer">
              Avisar a cliente no WhatsApp (mensagem pronta) ↗
            </a>
          )}
          {pedido.observacoes && <><h2>Observações</h2><p className="painel-obs">{pedido.observacoes}</p></>}

          <h2>Atualizar situação</h2>
          <div className="painel-acoes coluna">
            {pedido.origem === "site" && pedido.pagamento_status !== "approved" && pedido.status !== "cancelado" && (
              <p className="painel-erro">Pedido do site sem pagamento aprovado no Mercado Pago: não envie.</p>
            )}
            {PROXIMOS[pedido.status].filter((s) => !(pedido.origem === "site" && pedido.pagamento_status !== "approved" && ["pago", "enviado", "entregue"].includes(s))).map((s) => (
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
