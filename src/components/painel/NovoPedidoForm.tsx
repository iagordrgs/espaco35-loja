"use client";

import Image from "next/image";
import { startTransition, useActionState, useMemo, useState, type FormEvent } from "react";
import { criarPedido, type EstadoForm } from "@/app/painel/actions";
import { ENTREGAS, PAGAMENTOS, reais } from "@/lib/painel";

export type ParOpcao = { slug: string; name: string; code: string; brand: string; price: number; atacado: number; image: string };

const numero = (valor: string) => {
  const n = Number(valor.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export default function NovoPedidoForm({ pares, vendedores, inicial, minimoAtacado }: { pares: ParOpcao[]; vendedores: string[]; inicial: string[]; minimoAtacado: number }) {
  const [estado, acao, enviando] = useActionState<EstadoForm, FormData>(criarPedido, {});
  // envio manual: com action={...} o React limpa o formulário quando o pedido volta com erro
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const dados = new FormData(e.currentTarget);
    startTransition(() => acao(dados));
  };
  const [escolhidos, setEscolhidos] = useState<string[]>(inicial);
  const [busca, setBusca] = useState("");
  const [desconto, setDesconto] = useState("");
  const [frete, setFrete] = useState("");
  const [tipo, setTipo] = useState<"varejo" | "atacado">("varejo");

  const selecionados = pares.filter((p) => escolhidos.includes(p.slug));
  const atacado = tipo === "atacado";
  const faltam = Math.max(minimoAtacado - selecionados.length, 0);
  const precoDe = (p: ParOpcao) => (atacado ? p.atacado : p.price);
  const subtotal = selecionados.reduce((soma, p) => soma + precoDe(p), 0);
  const total = Math.max(subtotal - Math.min(numero(desconto), subtotal), 0) + numero(frete);

  const resultados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    if (!termo) return [];
    return pares.filter((p) => !escolhidos.includes(p.slug) && `${p.name} ${p.code} ${p.brand}`.toLowerCase().includes(termo)).slice(0, 8);
  }, [busca, pares, escolhidos]);

  return (
    <form onSubmit={enviar} className="painel-form">
      <section className="painel-bloco">
        <h2>Pares</h2>
        <div className="painel-abas painel-tipo" role="radiogroup" aria-label="Tipo de venda">
          {(["varejo", "atacado"] as const).map((t) => (
            <label key={t} className={tipo === t ? "is-active" : undefined}>
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} />
              {t === "varejo" ? "Varejo" : `Atacado (${minimoAtacado}+ pares)`}
            </label>
          ))}
        </div>
        {atacado && faltam > 0 && <p className="painel-aviso">Faltam {faltam} {faltam === 1 ? "par" : "pares"} para o preço de atacado.</p>}
        <input type="search" placeholder="Busque pelo nome ou código (ex.: E35-014)" value={busca} onChange={(e) => setBusca(e.target.value)} aria-label="Buscar par disponível" />
        {resultados.length > 0 && (
          <ul className="painel-resultados">
            {resultados.map((p) => (
              <li key={p.slug}>
                <button type="button" onClick={() => { setEscolhidos([...escolhidos, p.slug]); setBusca(""); }}>
                  <span className="painel-thumb"><Image src={p.image} alt="" fill sizes="48px" /></span>
                  <span><strong>{p.name}</strong><small>{p.code} · {p.brand}</small></span>
                  <span>{reais(precoDe(p))}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {busca && resultados.length === 0 && <p className="painel-sub">Nenhum par disponível com esse nome.</p>}

        {selecionados.length > 0 ? (
          <ul className="painel-escolhidos">
            {selecionados.map((p) => (
              <li key={p.slug}>
                <input type="hidden" name="pares" value={p.slug} />
                <span className="painel-thumb"><Image src={p.image} alt="" fill sizes="48px" /></span>
                <span><strong>{p.name}</strong><small>{p.code}</small></span>
                <span>{reais(precoDe(p))}</span>
                <button type="button" className="painel-botao" onClick={() => setEscolhidos(escolhidos.filter((s) => s !== p.slug))} aria-label={`Tirar ${p.name}`}>Tirar</button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="painel-sub">Nenhum par escolhido ainda.</p>
        )}
      </section>

      <section className="painel-bloco painel-grade">
        <h2>Cliente</h2>
        <label>Nome<input name="cliente_nome" required /></label>
        <label>WhatsApp<input name="cliente_telefone" inputMode="tel" placeholder="(85) 99999-9999" /></label>
        <label>Cidade<input name="cliente_cidade" placeholder="Fortaleza - CE" /></label>
      </section>

      <section className="painel-bloco painel-grade">
        <h2>Pagamento e entrega</h2>
        <label>Forma de pagamento<select name="pagamento" defaultValue="Pix">{PAGAMENTOS.map((p) => <option key={p}>{p}</option>)}</select></label>
        <label>Entrega<select name="entrega" defaultValue="Correios">{ENTREGAS.map((e) => <option key={e}>{e}</option>)}</select></label>
        <label>Desconto (R$)<input name="desconto" inputMode="decimal" value={desconto} onChange={(e) => setDesconto(e.target.value)} placeholder="0,00" /></label>
        <label>Frete (R$)<input name="frete" inputMode="decimal" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="0,00" /></label>
        <label>Vendedor(a)
          <input name="vendedor" list="vendedores" placeholder="Quem atendeu" />
          <datalist id="vendedores">{vendedores.map((v) => <option key={v} value={v} />)}</datalist>
        </label>
        <label>Situação
          <select name="status" defaultValue="novo">
            <option value="novo">Aguardando pagamento (reserva o par por 24 h)</option>
            <option value="pago">Já pago (marca como vendido)</option>
          </select>
        </label>
        <label className="painel-largo">Observações<textarea name="observacoes" rows={3} placeholder="Endereço, combinado de entrega, troca..." /></label>
      </section>

      <footer className="painel-rodape-form">
        <dl>
          <div><dt>Subtotal</dt><dd>{reais(subtotal)}</dd></div>
          <div><dt>Total</dt><dd><strong>{reais(total)}</strong></dd></div>
        </dl>
        {estado.erro && <p className="painel-erro" role="alert">{estado.erro}</p>}
        <button type="submit" className="button button-red" disabled={enviando || selecionados.length === 0 || (atacado && faltam > 0)}>
          {enviando ? "Salvando..." : "Salvar pedido"}
        </button>
      </footer>
    </form>
  );
}
