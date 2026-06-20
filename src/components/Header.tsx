"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/context/CartContext";
import { categories } from "@/data/products";

export default function Header() {
  const { totalItems } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-brand text-white shadow-[0_2px_12px_-4px_rgba(0,0,0,0.3)]">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 h-[74px]">
        <Link href="/" className="font-serif text-xl tracking-[0.22em] text-white">
          ESPAÇO <span className="font-extrabold">35</span>
        </Link>
        <nav className="hidden items-center gap-8 text-[13.5px] tracking-wide text-white/85 md:flex">
          <Link href="/produtos" className="transition hover:text-white">Coleção</Link>
          {categories.map((c) => (
            <Link key={c.key} href={`/produtos?categoria=${c.key}`} className="transition hover:text-white">
              {c.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link
            href="/carrinho"
            className="relative inline-flex items-center gap-2 rounded-full border border-white/50 px-4 py-2 text-[13px] tracking-wide text-white transition hover:bg-white hover:text-brand"
          >
            Carrinho
            {totalItems > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold text-brand">
                {totalItems}
              </span>
            )}
          </Link>
          <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Menu" className="text-2xl text-white md:hidden">
            ☰
          </button>
        </div>
      </div>
      {open && (
        <nav className="flex flex-col gap-4 border-t border-white/20 bg-brand px-6 py-5 text-sm text-white md:hidden">
          <Link href="/produtos" onClick={() => setOpen(false)}>Coleção</Link>
          {categories.map((c) => (
            <Link key={c.key} href={`/produtos?categoria=${c.key}`} onClick={() => setOpen(false)}>{c.label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}
