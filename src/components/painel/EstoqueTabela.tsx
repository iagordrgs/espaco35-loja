"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { definirEstoque } from "@/app/painel/actions";
import { formatPrice } from "@/data/products";
import { dataHora } from "@/lib/painel";

export type LinhaTabela = {
  slug: string;
  code: string;
  name: string;
  category: string;
  brand: string;
  price: number | null;
  image: string;
  status: "disponivel" | "reservado" | "vendido";
  reservadoAte: string | null;
  pedidoId: number | null;
  fixoNoCatalogo: boolean; // soldOut no products.ts: só muda editando o arquivo
};

const ROTULO = { disponivel: "Disponível", reservado: "Reservado", vendido: "Vendido" };

function Acao({ slug, status, horas, children, variante = "" }: { slug: string; status: string; horas?: number; children: React.ReactNode; variante?: string }) {
  return (
    <form action={definirEstoque}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="status" value={status} />
      {horas && <input type="hidden" name="horas" value={horas} />}
      <button type="submit" className={`painel-botao ${variante}`}>{children}</button>
    </form>
  );
}

export default function EstoqueTabela({ linhas }: { linhas: LinhaTabela[] }) {
  const [filtro, setFiltro] = useState<"todos" | LinhaTabela["status"]>("todos");
  const [busca, setBusca] = useState("");
  const [horas, setHoras] = useState(24);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return linhas.filter(
      (l) => (filtro === "todos" || l.status === filtro) && (!termo || `${l.name} ${l.code} ${l.brand}`.toLowerCase().includes(termo)),
    );
  }, [linhas, filtro, busca]);

  return (
    <>
      <div className="painel-filtros">
        <input type="search" placeholder="Buscar por nome, código ou marca" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar par" />
        <div className="painel-abas" role="group" aria-label="Filtrar por situação">
          {(["todos", "disponivel", "reservado", "vendido"] as const).map((f) => (
            <button key={f} type="button" className={filtro === f ? "is-active" : undefined} aria-pressed={filtro === f} onClick={() => setFiltro(f)}>
              {f === "todos" ? "Todos" : ROTULO[f]}
            </button>
          ))}
        </div>
        <label className="painel-horas">
          Reservar por
          <select value={horas} onChange={(e) => setHoras(Number(e.target.value))}>
            {[2, 6, 12, 24, 48, 72].map((h) => <option key={h} value={h}>{h} horas</option>)}
          </select>
        </label>
      </div>

      <div className="painel-tabela-wrap">
        <table className="painel-tabela">
          <thead>
            <tr><th>Par</th><th>Preço</th><th>Situação</th><th aria-label="Ações" /></tr>
          </thead>
          <tbody>
            {visiveis.map((l) => (
              <tr key={l.slug}>
                <td>
                  <div className="painel-par">
                    <span className="painel-thumb"><Image src={l.image} alt="" fill sizes="48px" /></span>
                    <span><strong>{l.name}</strong><small>{l.code} · {l.brand}</small></span>
                  </div>
                </td>
                <td>{formatPrice(l.price)}</td>
                <td>
                  <span className={`painel-status status-${l.status}`}>{ROTULO[l.status]}</span>
                  {l.reservadoAte && <small className="painel-sub">até {dataHora(l.reservadoAte)}</small>}
                  {l.pedidoId && <Link className="painel-sub painel-link" href={`/painel/pedidos/${l.pedidoId}`}>Pedido #{l.pedidoId}</Link>}
                </td>
                <td>
                  <div className="painel-acoes">
                    {l.fixoNoCatalogo ? (
                      <small className="painel-sub">Marcado como vendido no products.ts</small>
                    ) : l.pedidoId ? (
                      <Link href={`/painel/pedidos/${l.pedidoId}`} className="painel-botao">Abrir pedido</Link>
                    ) : l.status === "disponivel" ? (
                      <>
                        <Link href={`/painel/pedidos/novo?par=${l.slug}`} className="painel-botao principal">Vender</Link>
                        <Acao slug={l.slug} status="reservado" horas={horas}>Reservar {horas}h</Acao>
                        <Acao slug={l.slug} status="vendido">Marcar vendido</Acao>
                      </>
                    ) : (
                      <Acao slug={l.slug} status="disponivel">Voltar ao estoque</Acao>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visiveis.length === 0 && <p className="painel-nada">Nenhum par com esse filtro.</p>}
      </div>
    </>
  );
}
