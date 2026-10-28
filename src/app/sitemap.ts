import type { MetadataRoute } from "next";
import { products } from "@/data/products";
import { SITE_URL } from "@/lib/site";

const BASE = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/produtos`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/trocas-e-devolucoes`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${BASE}/privacidade`, changeFrequency: "yearly", priority: 0.2 },
    ...products.map((p) => ({
      url: `${BASE}/produtos/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
