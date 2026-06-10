import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { categories, getFeatured } from "@/data/products";

export default function Home() {
  const featured = getFeatured();

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-brand/20 bg-gradient-to-b from-card to-background">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-6 px-4 py-20">
          <span className="rounded-full border border-brand/40 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand">
            Curadoria feminina · Fortaleza
          </span>
          <h1 className="max-w-2xl text-4xl font-bold leading-tight sm:text-5xl">
            Calçados femininos,{" "}
            <span className="text-brand">exclusivamente no 35</span>
          </h1>
          <p className="max-w-xl text-lg text-foreground/70">
            Pares novos, originais e com caixa — Mississipi, Pink Cats e
            Campesí. Coleções selecionadas, poucas unidades de cada modelo:
            viu, gostou, garante.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/produtos"
              className="rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
            >
              Ver a coleção
            </Link>
            <a
              href="https://wa.me/5585992442091"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-brand/40 px-6 py-3 font-semibold text-brand transition hover:bg-brand/10"
            >
              Falar no WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Categorias */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-6 text-2xl font-bold">Compre por categoria</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.key}
              href={`/produtos?categoria=${c.key}`}
              className="rounded-xl border border-white/10 bg-card p-6 text-center font-medium transition hover:border-brand/50 hover:text-brand"
            >
              {c.label}
            </Link>
          ))}
        </div>
      </section>

      {/* Destaques */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Destaques</h2>
          <Link
            href="/produtos"
            className="text-sm font-medium text-brand hover:underline"
          >
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
