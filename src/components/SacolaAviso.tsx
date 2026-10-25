"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useCart } from "@/context/CartContext";
import { formatPrice } from "@/data/products";

// Abre na hora em que a cliente adiciona um par: confirma e dá o atalho para finalizar a compra.
export default function SacolaAviso() {
  const { ultimoAdicionado: par, fecharAviso, totalItems } = useCart();
  const finalizar = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!par) return;
    finalizar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && fecharAviso();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [par, fecharAviso]);

  if (!par) return null;

  return (
    <div className="sacola-aviso-fundo" onClick={fecharAviso}>
      <div className="sacola-aviso" role="dialog" aria-modal="true" aria-labelledby="sacola-aviso-titulo" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="sacola-aviso-fechar" onClick={fecharAviso} aria-label="Fechar">×</button>
        <span className="sacola-aviso-check" aria-hidden="true">✓</span>
        <h2 id="sacola-aviso-titulo">Adicionado à sacola</h2>
        <div className="sacola-aviso-par">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={par.images[0]} alt="" />
          <div>
            <strong>{par.name}</strong>
            <span>{formatPrice(par.price)}</span>
          </div>
        </div>
        <Link ref={finalizar} href="/checkout" className="button button-red" onClick={fecharAviso}>
          Finalizar compra{totalItems > 1 ? ` · ${totalItems} pares` : ""} <span aria-hidden="true">↗</span>
        </Link>
        <button type="button" className="sacola-aviso-continuar" onClick={fecharAviso}>Continuar escolhendo</button>
      </div>
    </div>
  );
}
