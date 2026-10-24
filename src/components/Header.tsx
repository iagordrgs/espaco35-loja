"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { getActiveCategories } from "@/data/products";

const categories = getActiveCategories();

export default function Header() {
  const { totalItems } = useCart();
  const { count: favoritesCount } = useFavorites();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <div className="announcement-bar">
        <span>Uma seleção especial, sempre no 35.</span>
        <Link href="/produtos">Descubra a coleção <span aria-hidden="true">↗</span></Link>
      </div>
      <header className="site-header">
        <div className="header-inner">
          <Link href="/" className="brand-lockup" aria-label="Espaço 35 — início">
            <span className="brand-mark">35</span>
            <span className="brand-name">ESPAÇO<span>CALÇADOS FEMININOS</span></span>
          </Link>

          <nav className="desktop-nav" aria-label="Navegação principal">
            <Link href="/produtos">Novidades</Link>
            {categories.map((category) => (
              <Link key={category.key} href={`/produtos?categoria=${category.key}`}>
                {category.label}
              </Link>
            ))}
          </nav>

          <div className="header-actions">
            <Link href="/produtos#busca" className="header-icon-link search-link" aria-label="Buscar produtos">
              <SearchIcon />
            </Link>
            <Link href="/favoritos" className="header-icon-link" aria-label={`Favoritos${favoritesCount ? `, ${favoritesCount} salvos` : ""}`}>
              <HeartIcon />
              {favoritesCount > 0 && <span className="header-count">{favoritesCount}</span>}
            </Link>
            <Link href="/carrinho" className="header-icon-link cart-link" aria-label={`Sacola${totalItems ? `, ${totalItems} pares` : ""}`}>
              <BagIcon />
              <span className="cart-label">Sacola</span>
              <span className="header-count">{totalItems}</span>
            </Link>
            <button
              type="button"
              className="menu-toggle"
              onClick={() => setOpen((current) => !current)}
              aria-label={open ? "Fechar menu" : "Abrir menu"}
              aria-expanded={open}
              aria-controls="mobile-navigation"
            >
              <span />
              <span />
            </button>
          </div>
        </div>
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Navegação móvel" hidden={!open}>
            <Link href="/produtos" onClick={() => setOpen(false)}>Novidades e coleção <span>↗</span></Link>
            {categories.map((category) => (
              <Link key={category.key} href={`/produtos?categoria=${category.key}`} onClick={() => setOpen(false)}>
                {category.label}<span>↗</span>
              </Link>
            ))}
            <Link href="/produtos#busca" onClick={() => setOpen(false)}>Buscar produtos<span><SearchIcon /></span></Link>
            <Link href="/favoritos" onClick={() => setOpen(false)}>Meus favoritos<span>♡</span></Link>
        </nav>
      </header>
    </>
  );
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.5" stroke="currentColor" strokeWidth="1.7"/><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}

function HeartIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M20.4 8.8c0 4.4-8.4 10-8.4 10s-8.4-5.6-8.4-10a4.6 4.6 0 0 1 8.4-2.5 4.6 4.6 0 0 1 8.4 2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/></svg>;
}

function BagIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><path d="M5.2 8.5h13.6l1 11H4.2l1-11Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"/><path d="M8.5 8.5V6.8a3.5 3.5 0 0 1 7 0v1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/></svg>;
}
