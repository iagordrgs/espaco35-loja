"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { formatPrice, type Product } from "@/data/products";
import { useCart } from "@/context/CartContext";

export default function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [fav, setFav] = useState(false);
  const [added, setAdded] = useState(false);

  function add(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price ?? 0,
      image: product.images[0],
      size: product.sizes[0],
      color: product.colors[0],
      quantity: 1,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--line)] bg-card transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_40px_-26px_rgba(47,41,37,0.35)]"
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        <Image
          src={product.images[0]}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-contain p-3 transition duration-700 group-hover:scale-105"
        />
        {product.lastUnits ? (
          <span className="absolute left-3 top-3 rounded-full border border-[var(--line)] bg-card px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-brand">
            Últimas unidades
          </span>
        ) : null}
        {product.images.length > 1 ? (
          <span className="absolute bottom-3 right-3 rounded-full border border-[var(--line)] bg-card/90 px-2.5 py-1 text-[10px] font-medium text-muted">
            {product.images.length} fotos
          </span>
        ) : null}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setFav((f) => !f);
          }}
          aria-label="Favoritar"
          className={`absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/85 text-base opacity-0 transition group-hover:opacity-100 ${
            fav ? "text-brand" : "text-muted"
          }`}
        >
          {fav ? "♥" : "♡"}
        </button>
        <button
          type="button"
          onClick={add}
          className="absolute inset-x-3 bottom-3 translate-y-3 rounded-xl bg-foreground/95 py-2.5 text-center text-[12.5px] font-semibold tracking-wide text-background opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100"
        >
          {added ? "✓ Adicionado" : "Adicionar ao carrinho"}
        </button>
      </div>
      <div className="flex flex-1 flex-col gap-1 p-5">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-brand">
          {product.brand}
        </span>
        <h3 className="font-serif text-[17px] leading-tight text-foreground">
          {product.name}
        </h3>
        <span className="mt-1 text-[11px] tracking-wide text-muted">
          Tamanho 35 · original e novo
        </span>
        <span className="mt-3 flex items-baseline gap-2">
          {product.compareAtPrice != null ? (
            <s className="text-[13px] text-muted">
              {formatPrice(product.compareAtPrice)}
            </s>
          ) : null}
          <span className="font-serif text-lg text-foreground">
            {formatPrice(product.price)}
          </span>
        </span>
      </div>
    </Link>
  );
}
