import Image from "next/image";
import Link from "next/link";
import { formatPrice, type Product } from "@/data/products";

export default function ProductCard({ product }: { product: Product }) {
  return (
    <Link
      href={`/produtos/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-card transition hover:-translate-y-0.5 hover:border-brand/50"
    >
      <div className="relative aspect-square overflow-hidden bg-white">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition duration-300 group-hover:scale-105"
        />
        {product.lastUnits && (
          <span className="absolute left-3 top-3 rounded-full bg-brand/95 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-background shadow">
            Últimas unidades
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <span className="text-xs uppercase tracking-[0.15em] text-brand">
          {product.brand}
        </span>
        <h3 className="font-medium leading-tight text-foreground">
          {product.name}
        </h3>
        <span className="mt-1 text-[11px] tracking-wide text-muted">
          Tamanho 35 · original e novo
        </span>
        <span className="mt-auto flex items-baseline gap-2 pt-2">
          {product.compareAtPrice != null && (
            <s className="text-xs text-muted">
              {formatPrice(product.compareAtPrice)}
            </s>
          )}
          <span className="text-lg font-bold text-brand">
            {formatPrice(product.price)}
          </span>
        </span>
      </div>
    </Link>
  );
}
