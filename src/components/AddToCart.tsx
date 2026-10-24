"use client";

import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { isAvailable, type Product } from "@/data/products";

export default function AddToCart({ product }: { product: Product }) {
  const { add, has } = useCart();
  const available = isAvailable(product);
  const added = has(product.slug);

  return (
    <div className="add-to-cart-panel">
      <dl className="detail-specs">
        <dt>Tamanho</dt><dd>{product.sizes.join(", ")}</dd>
        <dt>Cor</dt><dd>{product.colors.join(" e ")}</dd>
      </dl>
      <div className="detail-cta">
        {!available ? (
          <button type="button" disabled className="button button-outline">{product.reserved ? "Par reservado para outra cliente" : "Este par já foi vendido"}</button>
        ) : added ? (
          <Link href="/carrinho" className="button button-red">Na sacola · ver pedido <span>↗</span></Link>
        ) : (
          <button type="button" onClick={() => add(product.slug)} className="button button-red">Adicionar à sacola <span>+</span></button>
        )}
      </div>
    </div>
  );
}
