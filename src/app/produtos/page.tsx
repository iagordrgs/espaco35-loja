import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import {
  categories,
  getProductsByCategory,
  type Category,
} from "@/data/products";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const active = categories.find((c) => c.key === categoria)?.key;
  const list = getProductsByCategory(active as Category | undefined);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        {active ? categories.find((c) => c.key === active)?.label : "Todos os produtos"}
      </h1>
      <p className="mt-1 text-muted">
        {list.length} {list.length === 1 ? "produto" : "produtos"}
      </p>

      {/* Filtros */}
      <div className="mt-6 flex flex-wrap gap-2">
        <FilterChip href="/produtos" label="Todos" active={!active} />
        {categories.map((c) => (
          <FilterChip
            key={c.key}
            href={`/produtos?categoria=${c.key}`}
            label={c.label}
            active={active === c.key}
          />
        ))}
      </div>

      {/* Grade */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {list.map((p) => (
          <ProductCard key={p.slug} product={p} />
        ))}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
        active
          ? "border-brand bg-brand font-bold text-background"
          : "border-brand/30 text-foreground/75 hover:border-brand"
      }`}
    >
      {label}
    </Link>
  );
}
