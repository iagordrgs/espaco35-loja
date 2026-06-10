"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

export default function CheckoutPage() {
  const { items, totalPrice, clear } = useCart();
  const [done, setDone] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    // STUB: nenhuma cobrança real é feita. Integração de pagamento entra aqui.
    setDone(true);
    clear();
  }

  if (done) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="text-5xl">✓</div>
        <h1 className="mt-4 text-2xl font-bold">Pedido confirmado!</h1>
        <p className="mt-2 text-muted">
          Obrigado pela compra. Este é um checkout demonstrativo — nenhum
          pagamento foi processado.
        </p>
        <Link
          href="/produtos"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
        >
          Voltar à loja
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Nada para finalizar</h1>
        <p className="mt-2 text-muted">Seu carrinho está vazio.</p>
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
      <h1 className="text-3xl font-bold">Finalizar compra</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
        <form onSubmit={handleSubmit} className="space-y-6">
          <fieldset className="space-y-4 rounded-xl border border-white/5 bg-card p-6">
            <legend className="px-2 font-semibold">Dados de entrega</legend>
            <Field label="Nome completo" name="nome" />
            <Field label="E-mail" name="email" type="email" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="CEP" name="cep" />
              <Field label="Telefone" name="telefone" />
            </div>
            <Field label="Endereço" name="endereco" />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cidade" name="cidade" />
              <Field label="Estado" name="estado" />
            </div>
          </fieldset>

          <fieldset className="space-y-2 rounded-xl border border-white/5 bg-card p-6">
            <legend className="px-2 font-semibold">Pagamento</legend>
            <p className="text-sm text-muted">
              💳 Checkout demonstrativo. A integração de pagamento (ex.: Stripe,
              Mercado Pago) entra nesta etapa.
            </p>
          </fieldset>

          <button
            type="submit"
            className="w-full rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
          >
            Confirmar pedido — {formatPrice(totalPrice)}
          </button>
        </form>

        <aside className="h-fit rounded-xl border border-white/5 bg-card p-6">
          <h2 className="text-lg font-bold">Seu pedido</h2>
          <ul className="mt-4 space-y-3 text-sm">
            {items.map((i) => (
              <li
                key={`${i.slug}-${i.size}-${i.color}`}
                className="flex justify-between gap-2"
              >
                <span className="text-muted">
                  {i.quantity}× {i.name} ({i.size}/{i.color})
                </span>
                <span>{formatPrice(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-lg font-bold">
            <span>Total</span>
            <span className="text-brand">{formatPrice(totalPrice)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
}: {
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        name={name}
        type={type}
        required
        className="mt-1 w-full rounded-lg border border-white/15 bg-background px-3 py-2 outline-none focus:border-brand focus:ring-1 focus:ring-brand"
      />
    </label>
  );
}
