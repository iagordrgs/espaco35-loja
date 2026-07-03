import type { MetadataRoute } from "next";
import { products } from "@/data/products";

const BASE = "https://espaco35-loja.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/produtos`, changeFrequency: "weekly", priority: 0.9 },
    ...products.map((p) => ({
      url: `${BASE}/produtos/${p.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
