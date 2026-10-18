"use client";

import { useCart } from "@/context/CartContext";

// Aviso de pares que estavam no carrinho e já foram vendidos (cada modelo é um par único).
export default function AvisoIndisponiveis() {
  const { unavailable, removeUnavailable } = useCart();
  if (unavailable.length === 0) return null;

  return (
    <div
      role="status"
      className="rounded-xl border border-accent bg-accent/15 p-4 text-sm"
    >
      <p className="font-semibold">
        {unavailable.length === 1
          ? "Um par do seu carrinho não está mais à venda"
          : `${unavailable.length} pares do seu carrinho não estão mais à venda`}
      </p>
      <ul className="mt-2 list-disc pl-5 text-foreground/80">
        {unavailable.map((u) => (
          <li key={u.slug}>{u.name ?? "Par que já foi vendido"}</li>
        ))}
      </ul>
      <p className="mt-2 text-foreground/80">
        Cada modelo é um par único e esse já saiu. Ele não entra no pedido.
      </p>
      <button
        type="button"
        onClick={removeUnavailable}
        className="mt-3 font-semibold text-brand hover:underline"
      >
        Tirar do carrinho
      </button>
    </div>
  );
}
