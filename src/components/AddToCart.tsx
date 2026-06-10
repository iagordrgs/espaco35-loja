"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import type { Product } from "@/data/products";

export default function AddToCart({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [size, setSize] = useState<number | null>(null);
  const [color, setColor] = useState<string>(product.colors[0]);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState(false);

  function handleAdd() {
    if (size === null) {
      setError(true);
      return;
    }
    addItem({
      slug: product.slug,
      name: product.name,
      price: product.price ?? 0, // sob consulta entra como 0 no carrinho
      image: product.image,
      size,
      color,
      quantity,
    });
    setAdded(true);
    setError(false);
    setTimeout(() => setAdded(false), 2500);
  }

  return (
    <div className="mt-8 space-y-6">
      {/* Cor */}
      <div>
        <label className="text-sm font-semibold">Cor</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              className={`rounded-full border px-4 py-1.5 text-sm transition ${
                color === c
                  ? "border-brand bg-brand text-background"
                  : "border-white/15 hover:border-brand/60"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Tamanho */}
      <div>
        <label className="text-sm font-semibold">
          Tamanho{" "}
          {error && (
            <span className="font-normal text-red-600">
              — selecione um tamanho
            </span>
          )}
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {product.sizes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setSize(s);
                setError(false);
              }}
              className={`h-10 w-12 rounded-lg border text-sm font-medium transition ${
                size === s
                  ? "border-brand bg-brand text-background"
                  : "border-white/15 hover:border-brand/60"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Quantidade */}
      <div>
        <label className="text-sm font-semibold">Quantidade</label>
        <div className="mt-2 inline-flex items-center rounded-lg border border-white/15">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="px-3 py-2 text-lg leading-none hover:text-brand"
            aria-label="Diminuir"
          >
            −
          </button>
          <span className="w-10 text-center font-medium">{quantity}</span>
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            className="px-3 py-2 text-lg leading-none hover:text-brand"
            aria-label="Aumentar"
          >
            +
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-full bg-brand px-8 py-3 font-semibold text-background transition hover:bg-accent"
        >
          Adicionar ao carrinho
        </button>
        {added && (
          <Link
            href="/carrinho"
            className="text-sm font-medium text-brand hover:underline"
          >
            ✓ Adicionado! Ver carrinho →
          </Link>
        )}
      </div>
    </div>
  );
}
