"use client";

import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { useFavorites } from "@/context/FavoritesContext";
import { products } from "@/data/products";

export default function FavoritosPage() {
  const { hydrated, slugs, clear } = useFavorites();
  const favorites = slugs.map((slug) => products.find((product) => product.slug === slug)).filter((product) => product !== undefined);

  if (!hydrated) return <main className="empty-page" aria-busy="true" />;

  return (
    <main className="catalog-shell">
      <div className="catalog-topline">
        <div>
          <p className="page-kicker">Sua lista pessoal</p>
          <h1 className="page-title">Seus favoritos<span style={{ color: "var(--brand)" }}>.</span></h1>
          <p className="page-intro">Guarde aqui os pares que chamaram sua atenção. Os favoritos ficam salvos neste aparelho.</p>
        </div>
        {favorites.length > 0 && <button type="button" className="clear-filters" onClick={clear}>Limpar lista</button>}
      </div>
      {favorites.length > 0 ? (
        <div className="products-grid" style={{ marginTop: 28 }}>
          {favorites.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      ) : (
        <div className="empty-page">
          <span className="empty-mark" aria-hidden="true">♡</span>
          <h2>Sua lista começa com um favorito.</h2>
          <p>Toque no coração de qualquer par para guardar aqui e encontrar depois.</p>
          <Link href="/produtos" className="button button-dark">Explorar a coleção <span>↗</span></Link>
        </div>
      )}
    </main>
  );
}
