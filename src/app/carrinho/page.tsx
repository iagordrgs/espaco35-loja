"use client";

import Image from "next/image";
import Link from "next/link";
import AvisoIndisponiveis from "@/components/AvisoIndisponiveis";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function CarrinhoPage() {
  const { hydrated, products, unavailable, remove, totalItems, totalPrice } =
    useCart();

  // Antes de ler o carrinho do celular não dá para dizer que ele está vazio.
  if (!hydrated) return <div className="min-h-[50vh]" aria-busy="true" />;

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        {unavailable.length > 0 ? (
          <div className="mb-8 text-left">
            <AvisoIndisponiveis />
          </div>
        ) : null}
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
      <p className="mt-1 text-muted">
        {totalItems} {totalItems === 1 ? "par" : "pares"} · cada modelo é um
        par único
      </p>

      {unavailable.length > 0 ? (
        <div className="mt-6">
          <AvisoIndisponiveis />
        </div>
      ) : null}

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Pares */}
        <ul className="space-y-4">
          {products.map((p) => (
            <li
              key={p.slug}
              className="flex gap-4 rounded-xl border border-[var(--line)] bg-card p-4"
            >
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-white">
                <Image
                  src={p.images[0]}
                  alt={p.name}
                  fill
                  sizes="96px"
                  className="object-contain p-1"
                />
              </div>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-2">
                  <Link
                    href={`/produtos/${p.slug}`}
                    className="font-medium hover:text-brand"
                  >
                    {p.name}
                  </Link>
                  <button
                    type="button"
                    onClick={() => remove(p.slug)}
                    className="text-sm text-muted hover:text-red-600"
                  >
                    Remover
                  </button>
                </div>
                <p className="text-sm text-muted">
                  Cód. {p.code} · Tam. {p.sizes.join(", ")} · {p.colors.join(" e ")}
                </p>
                <div className="mt-auto pt-2 text-right">
                  <span className="font-semibold text-brand">
                    {formatPrice(p.price)}
                  </span>
                </div>
              </div>
            </li>
          ))}
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
            Fechar pedido no WhatsApp
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
