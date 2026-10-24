import "server-only";
import { products, type Product } from "@/data/products";
import { aplicarEstoque, type MapaEstoque } from "@/lib/estoque-regras";
import { SUPABASE_KEY, SUPABASE_URL, supabaseConfigurado } from "@/lib/supabase/config";

export const TAG_ESTOQUE = "estoque";

// Lê do Supabase os pares reservados e vendidos. Guardado em cache por 1 minuto; o painel
// apaga o cache na hora em que muda um par. Se o banco falhar, o site segue com o products.ts.
export async function getEstoque(): Promise<MapaEstoque> {
  if (!supabaseConfigurado) return {};
  try {
    const resposta = await fetch(`${SUPABASE_URL}/rest/v1/estoque?select=slug,status,reservado_ate&status=neq.disponivel`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 60, tags: [TAG_ESTOQUE] },
    });
    if (!resposta.ok) return {};
    const linhas = (await resposta.json()) as { slug: string; status: "reservado" | "vendido"; reservado_ate: string | null }[];
    return Object.fromEntries(linhas.map((l) => [l.slug, { status: l.status, ate: l.reservado_ate }]));
  } catch {
    return {};
  }
}

// O catálogo com a situação de agora de cada par.
export async function getCatalogo(): Promise<Product[]> {
  const mapa = await getEstoque();
  const agora = Date.now();
  return products.map((p) => aplicarEstoque(p, mapa, agora));
}
