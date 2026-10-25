"use client";

import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";

// Esvazia a sacola quando a cliente volta do pagamento (os pares já estão no pedido). Uma vez só:
// limpar muda a sacola, que recria o `clear`, e sem a trava o efeito rodaria de novo sem parar.
export default function LimparSacola() {
  const { clear, hydrated } = useCart();
  const feito = useRef(false);
  useEffect(() => {
    if (!hydrated || feito.current) return;
    feito.current = true;
    clear();
  }, [hydrated, clear]);
  return null;
}
