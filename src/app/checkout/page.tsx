"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { formatPrice, getProduct } from "@/data/products";

const WHATSAPP = "5585992442091";

export default function CheckoutPage() {
  const { items, totalPrice, clear } = useCart();
  const [sent, setSent] = useState(false);

  function buildMessage() {
    const linhas = items.map((i) => {
      const code = getProduct(i.slug)?.code;
      return `• ${i.quantity}× ${i.name}${code ? ` (Cód. ${code}` : " ("}${
        code ? ", " : ""
      }tam. ${i.size}) — ${formatPrice(i.price * i.quantity)}`;
    });
    return [
      "Oi! 💛 Quero fechar meu pedido do site:",
      ...linhas,
      `Total: ${formatPrice(totalPrice)}`,
      "Como faço o pagamento e o envio?",
    ].join("\n");
  }

  function handleSend() {
    const url = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(buildMessage())}`;
    window.open(url, "_blank", "noopener");
    setSent(true);
    clear();
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="text-5xl">💬</div>
        <h1 className="mt-4 text-2xl font-bold">Pedido enviado no WhatsApp!</h1>
        <p className="mt-2 text-muted">
          A gente responde rapidinho — Seg a Sáb, 9h às 18h. Se a conversa não
          abriu, chama a gente no (85) 99244-2091.
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
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Fechar pedido</h1>
      <p className="mt-2 text-muted">
        A compra é finalizada no nosso WhatsApp: você envia o pedido pronto e a
        gente combina pagamento e envio com você. Rapidinho e sem cadastro.
      </p>

      <aside className="mt-8 rounded-xl border border-[var(--line)] bg-card p-6">
        <h2 className="text-lg font-bold">Seu pedido</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {items.map((i) => {
            const code = getProduct(i.slug)?.code;
            return (
              <li
                key={`${i.slug}-${i.size}-${i.color}`}
                className="flex justify-between gap-2"
              >
                <span className="text-muted">
                  {i.quantity}× {i.name}
                  {code ? ` · Cód. ${code}` : ""} · tam. {i.size}
                </span>
                <span>{formatPrice(i.price * i.quantity)}</span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Frete</span>
            <span className="text-foreground/70">A combinar no WhatsApp</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-brand">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSend}
          className="mt-6 w-full rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
        >
          Fechar pedido no WhatsApp
        </button>
        <p className="mt-3 text-center text-xs text-muted">
          Abre uma conversa no WhatsApp (85) 99244-2091 com o pedido já
          escrito. Nada é cobrado pelo site.
        </p>
      </aside>
    </div>
  );
}
