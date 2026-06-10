import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import {
  formatPrice,
  getProduct,
  getProductsByCategory,
  products,
} from "@/data/products";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  const related = getProductsByCategory(product.category)
    .filter((p) => p.slug !== product.slug)
    .slice(0, 4);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Início
        </Link>
        {" / "}
        <Link href="/produtos" className="hover:text-brand">
          Produtos
        </Link>
        {" / "}
        <span className="text-foreground">{product.name}</span>
      </nav>

      <div className="grid gap-10 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
            priority
          />
        </div>

        <div>
          <span className="text-xs uppercase tracking-[0.15em] text-brand">
            {product.brand}
          </span>
          <h1 className="mt-1 text-3xl font-bold">{product.name}</h1>
          <div className="mt-3 flex items-baseline gap-3">
            {product.compareAtPrice != null && (
              <s className="text-lg text-muted">
                {formatPrice(product.compareAtPrice)}
              </s>
            )}
            <p className="text-3xl font-bold text-brand">
              {formatPrice(product.price)}
            </p>
          </div>
          <p className="mt-4 text-foreground/80">{product.description}</p>

          <AddToCart product={product} />
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <h2 className="mb-6 text-2xl font-bold">Você também pode gostar</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((p) => (
              <ProductCard key={p.slug} product={p} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
