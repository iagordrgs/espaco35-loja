"use client";

import Image from "next/image";
import Link from "next/link";
import AvisoIndisponiveis from "@/components/AvisoIndisponiveis";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function CarrinhoCliente({ pagamentoOnline }: { pagamentoOnline: boolean }) {
  const { hydrated, products, unavailable, remove, totalItems, totalPrice } = useCart();
  if (!hydrated) return <main className="empty-cart" aria-busy="true" />;

  if (products.length === 0) {
    return (
      <main className="empty-cart">
        {unavailable.length > 0 && <div className="mb-8 text-left"><AvisoIndisponiveis /></div>}
        <span className="empty-mark" aria-hidden="true">35</span>
        <h1>Sua sacola ainda está vazia.</h1>
        <p>Descubra a curadoria de pares únicos, sempre no tamanho 35.</p>
        <Link href="/produtos" className="button button-dark">Explorar a coleção <span>↗</span></Link>
      </main>
    );
  }

  return (
    <main className="cart-shell">
      <div className="cart-heading">
        <p className="page-kicker">Quase seu</p>
        <h1 className="page-title">Sua sacola<span style={{ color: "var(--brand)" }}>.</span></h1>
        <p>{totalItems} {totalItems === 1 ? "par selecionado" : "pares selecionados"} · cada modelo é uma unidade única.</p>
      </div>
      {unavailable.length > 0 && <div style={{ marginTop: 18 }}><AvisoIndisponiveis /></div>}
      <div className="cart-grid">
        <ul className="cart-list">
          {products.map((product) => (
            <li key={product.slug} className="cart-item">
              <Link href={`/produtos/${product.slug}`} className="cart-item-image" aria-label={`Ver ${product.name}`}>
                <Image src={product.images[0]} alt={product.name} fill sizes="115px" />
              </Link>
              <div className="cart-item-info">
                <span className="product-brand">{product.brand}</span>
                <h2><Link href={`/produtos/${product.slug}`}>{product.name}</Link></h2>
                <p>Cód. {product.code} · tamanho {product.sizes.join(", ")} · {product.colors.join(" e ")}</p>
                <button type="button" onClick={() => remove(product.slug)} className="remove-item">Remover da sacola</button>
              </div>
              <strong className="cart-item-price">{formatPrice(product.price)}</strong>
            </li>
          ))}
        </ul>
        <aside className="cart-summary">
          <h2>Resumo do pedido</h2>
          <div className="summary-line"><span>Subtotal dos pares</span><span>{formatPrice(totalPrice)}</span></div>
          <div className="summary-line"><span>Frete</span><span>{pagamentoOnline ? "Calculado no próximo passo" : "A combinar"}</span></div>
          <div className="summary-total"><span>Total parcial</span><strong>{formatPrice(totalPrice)}</strong></div>
          <Link href="/checkout" className="button button-red">{pagamentoOnline ? "Finalizar compra" : "Continuar pelo WhatsApp"} <span>↗</span></Link>
          <p className="summary-note">{pagamentoOnline
            ? "Pague com Pix ou cartão em até 6x (com juros), ou finalize com a equipe pelo WhatsApp, se preferir."
            : "O frete e o pagamento são combinados diretamente com a loja. Nenhuma cobrança é feita neste site."}</p>
          <Link href="/produtos" className="continue-link">Continuar escolhendo</Link>
        </aside>
      </div>
    </main>
  );
}
