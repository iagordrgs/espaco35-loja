"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPrice, isAvailable, type Product } from "@/data/products";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import Reveal from "@/components/Reveal";

export default function ProductCard({ product, reveal = true }: { product: Product; reveal?: boolean }) {
  const { add, has: inCart } = useCart();
  const { has: isFavorite, toggle } = useFavorites();
  const [notice, setNotice] = useState("");
  const available = isAvailable(product);
  const saved = isFavorite(product.slug);
  const added = inCart(product.slug);

  function addProduct() {
    add(product.slug);
    setNotice("Par adicionado à sacola.");
  }

  return (
    <Reveal className="product-card" disabled={!reveal}>
      <div className="product-media">
        <Link href={`/produtos/${product.slug}`} className="product-image-link" aria-label={`Ver ${product.name}`}>
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            sizes="(max-width: 720px) 46vw, (max-width: 1000px) 30vw, 23vw"
          />
        </Link>
        {!available ? <span className="product-badge sold">Vendido</span> : product.lastUnits ? <span className="product-badge">Último par</span> : null}
        <button
          type="button"
          onClick={() => toggle(product.slug)}
          aria-label={saved ? `Remover ${product.name} dos favoritos` : `Salvar ${product.name} nos favoritos`}
          aria-pressed={saved}
          className={`favorite-toggle${saved ? " is-favorite" : ""}`}
        >
          <HeartIcon filled={saved} />
        </button>
      </div>
      <div className="product-info">
        <span className="product-brand">{product.brand}</span>
        <h3 className="product-name"><Link href={`/produtos/${product.slug}`}>{product.name}</Link></h3>
        <span className="product-detail-line">Par único · tamanho 35</span>
        <span className="product-price-line">
          {product.compareAtPrice != null && <s>{formatPrice(product.compareAtPrice)}</s>}
          <strong className="product-price">{formatPrice(product.price)}</strong>
        </span>
        {available ? (
          added ? <Link href="/carrinho" className="quick-add">Na sacola · ver pedido <span aria-hidden="true">↗</span></Link> : <button type="button" onClick={addProduct} className="quick-add">Adicionar à sacola</button>
        ) : <button type="button" className="quick-add" disabled>Par vendido</button>}
        <span className="screen-reader-only" role="status" aria-live="polite">{notice}</span>
      </div>
    </Reveal>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"}>
      <path d="M20.4 8.8c0 4.4-8.4 10-8.4 10s-8.4-5.6-8.4-10a4.6 4.6 0 0 1 8.4-2.5 4.6 4.6 0 0 1 8.4 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}
