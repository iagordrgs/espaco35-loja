"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { categories } from "@/data/products";

export default function Header() {
  const { totalItems } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-brand/25 bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold tracking-[0.25em] text-foreground">
            ESPAÇO
          </span>
          <span className="text-xl font-extrabold tracking-[0.25em] text-brand">
            35
          </span>
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-foreground/75 md:flex">
          <Link href="/produtos" className="transition hover:text-brand">
            Todos
          </Link>
          {categories.map((c) => (
            <Link
              key={c.key}
              href={`/produtos?categoria=${c.key}`}
              className="transition hover:text-brand"
            >
              {c.label}
            </Link>
          ))}
        </nav>

        <Link
          href="/carrinho"
          className="relative inline-flex items-center gap-2 rounded-full border border-brand/40 px-4 py-2 text-sm font-medium text-brand transition hover:bg-brand hover:text-background"
        >
          Carrinho
          {totalItems > 0 && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-bold text-background">
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
