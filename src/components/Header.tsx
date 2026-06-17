"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCart } from "@/context/CartContext";
import { categories } from "@/data/products";

export default function Header() {
  const { totalItems } = useCart();
  const pathname = usePathname();
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const solid = scrolled || !isHome || open;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        solid
          ? "bg-background/90 backdrop-blur border-b border-[var(--line)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 h-[74px]">
        <Link
          href="/"
          className="font-serif text-xl tracking-[0.22em] text-foreground"
        >
          ESPAÇO <span className="text-brand">35</span>
        </Link>

        <nav className="hidden items-center gap-8 text-[13.5px] tracking-wide text-muted md:flex">
          <Link href="/produtos" className="transition hover:text-foreground">
            Coleção
          </Link>
          {categories.map((c) => (
            <Link
              key={c.key}
              href={`/produtos?categoria=${c.key}`}
              className="transition hover:text-foreground"
            >
              {c.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/carrinho"
            className="relative inline-flex items-center gap-2 rounded-full border border-[var(--line)] px-4 py-2 text-[13px] tracking-wide text-foreground transition hover:bg-foreground hover:text-background"
          >
            Carrinho
            {totalItems > 0 && (
              <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-semibold text-white">
                {totalItems}
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            className="text-2xl text-foreground md:hidden"
          >
            ☰
          </button>
        </div>
      </div>

      {open && (
        <nav className="flex flex-col gap-4 border-t border-[var(--line)] bg-background px-6 py-5 text-sm text-muted md:hidden">
          <Link href="/produtos" onClick={() => setOpen(false)}>
            Coleção
          </Link>
          {categories.map((c) => (
            <Link
              key={c.key}
              href={`/produtos?categoria=${c.key}`}
              onClick={() => setOpen(false)}
            >
              {c.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
