import Link from "next/link";
import CatalogBrowser from "@/components/CatalogBrowser";
import { categories, getProductsByCategory, type Category } from "@/data/products";
import { getCatalogo } from "@/lib/estoque";

export default async function ProdutosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const active = categories.find((item) => item.key === categoria)?.key;
  const catalogo = await getCatalogo();
  const list = getProductsByCategory(active as Category | undefined, catalogo);
  const title = active ? categories.find((item) => item.key === active)?.label : "Toda a coleção";

  return (
    <main className="catalog-shell">
      <div className="catalog-topline">
        <div>
          <p className="page-kicker">Espaço 35 · Fortaleza</p>
          <h1 className="page-title">{title}</h1>
          <p className="page-intro">Modelos novos e originais das marcas Mississipi, Pink Cats e Campesí. Cada par disponível é único e está no tamanho 35.</p>
        </div>
      </div>

      <nav className="filter-row" aria-label="Filtrar por categoria">
        <span className="filter-label">Categorias:</span>
        <Link className={`filter-chip${!active ? " active" : ""}`} href="/produtos">Todas</Link>
        {categories.filter((item) => getProductsByCategory(item.key).length > 0).map((item) => (
          <Link key={item.key} className={`filter-chip${active === item.key ? " active" : ""}`} href={`/produtos?categoria=${item.key}`}>{item.label}</Link>
        ))}
      </nav>

      <CatalogBrowser products={list} />
    </main>
  );
}
