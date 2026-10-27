"use client";

import { useMemo, useState } from "react";
import ProductCard from "@/components/ProductCard";
import { isAvailable, type Product } from "@/data/products";
import { useFavorites } from "@/context/FavoritesContext";

export default function CatalogBrowser({ products }: { products: Product[] }) {
  const { has: isFavorite } = useFavorites();
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [sort, setSort] = useState("featured");
  const [availability, setAvailability] = useState("all");
  const [savedOnly, setSavedOnly] = useState(false);

  const brands = useMemo(() => [...new Set(products.map((product) => product.brand))].sort(), [products]);
  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    const result = products.filter((product) => {
      const matchesQuery = !normalizedQuery || [product.name, product.brand, product.code, ...product.colors].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
      const matchesBrand = brand === "all" || product.brand === brand;
      const matchesAvailability = availability === "all" || (availability === "available" ? isAvailable(product) : !isAvailable(product));
      return matchesQuery && matchesBrand && matchesAvailability && (!savedOnly || isFavorite(product.slug));
    });

    if (sort === "name") result.sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    if (sort === "price-asc") result.sort((a, b) => (a.price ?? Number.POSITIVE_INFINITY) - (b.price ?? Number.POSITIVE_INFINITY));
    if (sort === "price-desc") result.sort((a, b) => (b.price ?? -1) - (a.price ?? -1));
    if (sort === "newest") result.sort((a, b) => b.code.localeCompare(a.code));
    // em qualquer ordenação, par esgotado fica no fim da fila
    return result.sort((a, b) => Number(!isAvailable(a)) - Number(!isAvailable(b)));
  }, [availability, brand, isFavorite, products, query, savedOnly, sort]);

  const hasFilters = Boolean(query || brand !== "all" || sort !== "featured" || availability !== "all" || savedOnly);

  function clearFilters() {
    setQuery("");
    setBrand("all");
    setSort("featured");
    setAvailability("all");
    setSavedOnly(false);
  }

  return (
    <>
      <div className="catalog-tools" id="busca">
        <label className="search-field">
          <SearchIcon />
          <span className="screen-reader-only">Buscar por modelo, marca, cor ou código</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar modelo, marca, cor ou código" type="search" />
        </label>
        <label>
          <span className="screen-reader-only">Filtrar por marca</span>
          <select className="filter-select" value={brand} onChange={(event) => setBrand(event.target.value)}>
            <option value="all">Todas as marcas</option>
            {brands.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <label>
          <span className="screen-reader-only">Ordenar produtos</span>
          <select className="filter-select" value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="featured">Seleção Espaço 35</option>
            <option value="newest">Novidades</option>
            <option value="price-asc">Menor preço</option>
            <option value="price-desc">Maior preço</option>
            <option value="name">Nome A–Z</option>
          </select>
        </label>
      </div>

      <div className="filter-row" aria-label="Filtros de produto">
        <span className="filter-label">Mostrar:</span>
        <button type="button" className={`filter-chip${availability === "available" ? " active" : ""}`} onClick={() => setAvailability("available")} aria-pressed={availability === "available"}>À venda</button>
        <button type="button" className={`filter-chip${availability === "sold" ? " active" : ""}`} onClick={() => setAvailability("sold")} aria-pressed={availability === "sold"}>Esgotados</button>
        <button type="button" className={`filter-chip${availability === "all" ? " active" : ""}`} onClick={() => setAvailability("all")} aria-pressed={availability === "all"}>Todos os pares</button>
        <button type="button" className={`filter-chip${savedOnly ? " active" : ""}`} onClick={() => setSavedOnly((value) => !value)} aria-pressed={savedOnly}>♡ Salvos</button>
        {hasFilters && <button type="button" className="clear-filters" onClick={clearFilters}>Limpar filtros</button>}
      </div>

      <div className="results-line" aria-live="polite">
        <span>{filtered.length} {filtered.length === 1 ? "par encontrado" : "pares encontrados"}</span>
        <span>Todos no tamanho 35</span>
      </div>

      {filtered.length > 0 ? (
        <div className="products-grid">{filtered.map((product) => <ProductCard key={product.slug} product={product} />)}</div>
      ) : (
        <div className="empty-results">
          <h2>Nenhum par por aqui.</h2>
          <p>Tente outra busca ou ajuste os filtros da coleção.</p>
          <button type="button" onClick={clearFilters} className="button button-dark">Limpar filtros</button>
        </div>
      )}
    </>
  );
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><circle cx="10.8" cy="10.8" r="6.5" stroke="currentColor" strokeWidth="1.7"/><path d="m16 16 4.2 4.2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>;
}
