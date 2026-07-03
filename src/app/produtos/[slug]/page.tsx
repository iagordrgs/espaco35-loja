import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import {
  formatPrice,
  getProduct,
  getProductsByCategory,
  products,
} from "@/data/products";

const WHATSAPP = "5585992442091";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const title = `${product.name} · ${product.brand} · tam. 35`;
  const description = `${product.description} ${formatPrice(
    product.price
  )} — par único, novo e com caixa. Cód. ${product.code}.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: product.images.map((img) => ({ url: img })),
    },
  };
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
        <ProductGallery images={product.images} alt={product.name} />

        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-[0.15em] text-brand">
              {product.brand}
            </span>
            <span className="text-xs text-muted">Cód. {product.code}</span>
          </div>
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

          <a
            href={`https://wa.me/${WHATSAPP}?text=${encodeURIComponent(
              `Oi! 💛 Tenho interesse no(a) ${product.brand} ${product.name} (Cód. ${product.code}, tam. 35) que vi no site. Ainda está disponível?`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block w-full rounded-full border-2 border-brand px-8 py-3 text-center font-semibold text-brand transition hover:bg-brand hover:text-background sm:w-auto"
          >
            Comprar direto no WhatsApp
          </a>
          <p className="mt-3 text-xs text-muted">
            Par único no tamanho 35 — novo, original e com caixa.
          </p>
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
