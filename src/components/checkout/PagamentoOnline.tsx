"use client";

import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice, type Product } from "@/data/products";

type Opcao = { id: string; nome: string; preco: number; prazo: string };
type Endereco = { cep: string; rua: string; bairro: string; cidade: string; uf: string };

const mascaraCep = (v: string) => v.replace(/\D/g, "").slice(0, 8).replace(/^(\d{5})(\d)/, "$1-$2");

// Formulário do pagamento no site: dados, CEP (endereço e frete automáticos) e botão para o Mercado Pago.
export default function PagamentoOnline({ products, freteFortaleza }: { products: Product[]; freteFortaleza: number }) {
  const [cep, setCep] = useState("");
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [opcoes, setOpcoes] = useState<Opcao[]>([]);
  const [freteId, setFreteId] = useState("");
  const [avisoCep, setAvisoCep] = useState("");
  const [calculando, setCalculando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const { reserva, guardarReserva } = useCart();

  const subtotal = products.reduce((s, p) => s + (p.price ?? 0), 0);
  const frete = opcoes.find((o) => o.id === freteId);
  const total = subtotal + (frete?.preco ?? 0);

  async function calcular(valor: string) {
    const digitos = valor.replace(/\D/g, "");
    if (digitos.length !== 8) return;
    setCalculando(true);
    setAvisoCep("");
    setOpcoes([]);
    setFreteId("");
    try {
      const resposta = await fetch("/api/frete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cep: digitos, slugs: products.map((p) => p.slug) }),
      });
      const dados = await resposta.json();
      setEndereco(dados.endereco);
      setOpcoes(dados.opcoes ?? []);
      setFreteId(dados.opcoes?.[0]?.id ?? "");
      if (dados.aviso) setAvisoCep(dados.aviso);
    } catch {
      setAvisoCep("Não conseguimos calcular o frete agora. Tente de novo.");
    } finally {
      setCalculando(false);
    }
  }

  async function pagar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErro("");
    const f = new FormData(e.currentTarget);
    setEnviando(true);
    try {
      const resposta = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slugs: products.map((p) => p.slug),
          cliente: { nome: f.get("nome"), email: f.get("email"), telefone: f.get("telefone") },
          endereco: { cep, rua: f.get("rua"), numero: f.get("numero"), complemento: f.get("complemento"), bairro: f.get("bairro") },
          freteId,
          substituir: reserva?.codigo,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.url) throw new Error(dados.erro ?? "Não foi possível abrir o pagamento.");
      if (dados.codigo) guardarReserva({ codigo: dados.codigo, slugs: products.map((p) => p.slug), ate: Date.now() + 30 * 60_000 });
      window.location.href = dados.url;
    } catch (falha) {
      setErro(falha instanceof Error ? falha.message : "Não foi possível abrir o pagamento.");
      setEnviando(false);
    }
  }

  return (
    <form className="checkout-card pagamento-online" onSubmit={pagar}>
      <h2>Pagar agora · Pix ou cartão</h2>
      <p className="checkout-hint">Pagamento seguro pelo Mercado Pago. Entrega em Fortaleza por {formatPrice(freteFortaleza)} ou retirada grátis combinada com a equipe; para outras cidades, o frete é calculado pelo CEP.</p>

      <fieldset className="checkout-campos">
        <label className="largo">Nome completo<input name="nome" autoComplete="name" required minLength={3} /></label>
        <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
        <label>WhatsApp<input name="telefone" type="tel" inputMode="tel" autoComplete="tel" placeholder="(85) 99999-9999" required /></label>
      </fieldset>

      <fieldset className="checkout-campos">
        <label>CEP
          <input
            name="cep" inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" required value={cep}
            onChange={(e) => { const v = mascaraCep(e.target.value); setCep(v); if (v.replace(/\D/g, "").length === 8) calcular(v); }}
          />
        </label>
        {calculando && <p className="checkout-hint">Calculando o frete…</p>}
        {avisoCep && <p className="checkout-aviso" role="alert">{avisoCep}</p>}
        {endereco && (
          <>
            <label className="largo">Rua<input name="rua" defaultValue={endereco.rua} key={`rua-${endereco.cep}`} autoComplete="address-line1" required /></label>
            <label>Número<input name="numero" inputMode="numeric" required /></label>
            <label>Complemento<input name="complemento" placeholder="Apto e bloco, ou casa" autoComplete="address-line2" required minLength={2} /></label>
            <label>Bairro<input name="bairro" defaultValue={endereco.bairro} key={`bairro-${endereco.cep}`} required /></label>
            <p className="checkout-cidade">{endereco.cidade} - {endereco.uf}</p>
          </>
        )}
      </fieldset>

      {opcoes.length > 0 && (
        <fieldset className="checkout-frete">
          <legend>Entrega</legend>
          {opcoes.map((o) => (
            <label key={o.id} className={freteId === o.id ? "is-active" : undefined}>
              <input type="radio" name="frete" value={o.id} checked={freteId === o.id} onChange={() => setFreteId(o.id)} />
              <span><strong>{o.nome}</strong><small>{o.prazo}</small></span>
              <b>{formatPrice(o.preco)}</b>
            </label>
          ))}
        </fieldset>
      )}

      <div className="summary-line"><span>Pares</span><span>{formatPrice(subtotal)}</span></div>
      <div className="summary-line"><span>Frete</span><span>{frete ? formatPrice(frete.preco) : "informe o CEP"}</span></div>
      <div className="summary-total"><span>Total</span><strong>{formatPrice(total)}</strong></div>
      {erro && <p className="checkout-aviso" role="alert">{erro}</p>}
      <button type="submit" className="button button-red" disabled={enviando || !frete}>
        {enviando ? "Abrindo o pagamento…" : "Pagar com Pix ou cartão"} <span aria-hidden="true">↗</span>
      </button>
      <p className="checkout-hint">Seus pares ficam reservados por 30 minutos enquanto você paga.</p>
    </form>
  );
}
