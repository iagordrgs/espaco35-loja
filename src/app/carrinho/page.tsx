"use client";

import Image from "next/image";
import Link from "next/link";
import { itemKey, useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function CarrinhoPage() {
  const { items, removeItem, setQuantity, totalItems, totalPrice } = useCart();

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Seu carrinho está vazio</h1>
        <p className="mt-2 text-muted">
          Que tal dar uma olhada na nossa coleção?
        </p>
        <Link
          href="/produtos"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Carrinho</h1>
      <p className="mt-1 text-muted">{totalItems} item(ns)</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Itens */}
        <ul className="space-y-4">
          {items.map((item) => {
            const key = itemKey(item);
            return (
              <li
                key={key}
                className="flex gap-4 rounded-xl border border-[var(--line)] bg-card p-4"
              >
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>
                <div className="flex flex-1 flex-col">
                  <div className="flex justify-between gap-2">
                    <Link
                      href={`/produtos/${item.slug}`}
                      className="font-medium hover:text-brand"
                    >
                      {item.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => removeItem(key)}
                      className="text-sm text-muted hover:text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                  <p className="text-sm text-muted">
                    Tam. {item.size} · {item.color}
                  </p>
                  <div className="mt-auto flex items-center justify-between pt-2">
                    <div className="inline-flex items-center rounded-lg border border-[var(--line)]">
                      <button
                        type="button"
                        onClick={() => setQuantity(key, item.quantity - 1)}
                        className="px-3 py-1 hover:text-brand"
                        aria-label="Diminuir"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => setQuantity(key, item.quantity + 1)}
                        className="px-3 py-1 hover:text-brand"
                        aria-label="Aumentar"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-semibold text-brand">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {/* Resumo */}
        <aside className="h-fit rounded-xl border border-[var(--line)] bg-card p-6">
          <h2 className="text-lg font-bold">Resumo</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Subtotal</span>
              <span>{formatPrice(totalPrice)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">Frete</span>
              <span className="text-foreground/70">A combinar</span>
            </div>
          </div>
          <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4 text-lg font-bold">
            <span>Total</span>
            <span className="text-brand">{formatPrice(totalPrice)}</span>
          </div>
          <Link
            href="/checkout"
            className="mt-6 block rounded-full bg-brand px-6 py-3 text-center font-semibold text-background transition hover:bg-accent"
          >
            Finalizar compra
          </Link>
          <Link
            href="/produtos"
            className="mt-3 block text-center text-sm text-brand hover:underline"
          >
            Continuar comprando
          </Link>
        </aside>
      </div>
    </div>
  );
}
