"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { isAvailable, type Product } from "@/data/products";

// Cada modelo é um par único no tamanho 35: não há tamanho nem quantidade para escolher.
export default function AddToCart({ product }: { product: Product }) {
  const { add, has } = useCart();
  const vendido = !isAvailable(product);
  const noCarrinho = has(product.slug);

  return (
    <div className="mt-8 space-y-6">
      <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="font-semibold">Tamanho</dt>
        <dd>{product.sizes.join(", ")}</dd>
        <dt className="font-semibold">Cor</dt>
        <dd>{product.colors.join(" e ")}</dd>
      </dl>

      {vendido ? (
        <div>
          <button
            type="button"
            disabled
            className="cursor-not-allowed rounded-full bg-[var(--line)] px-8 py-3 font-semibold text-muted"
          >
            Vendido
          </button>
          <p className="mt-3 text-sm text-muted">
            Esse par já foi vendido.{" "}
            <Link href="/produtos" className="font-medium text-brand hover:underline">
              Veja os outros modelos →
            </Link>
          </p>
        </div>
      ) : noCarrinho ? (
        <Link
          href="/carrinho"
          className="inline-block rounded-full border-2 border-brand px-8 py-3 font-semibold text-brand transition hover:bg-brand hover:text-background"
        >
          ✓ No carrinho — ver carrinho
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => add(product.slug)}
          className="rounded-full bg-brand px-8 py-3 font-semibold text-background transition hover:bg-accent"
        >
          Adicionar ao carrinho
        </button>
      )}
    </div>
  );
}
