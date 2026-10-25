import { getCatalogo } from "@/lib/estoque";
import { cotarFrete } from "@/lib/frete";

// POST { cep, slugs } -> endereço do CEP e opções de frete (Fortaleza fixo; Brasil pelo Melhor Envio).
export async function POST(request: Request) {
  const corpo = await request.json().catch(() => null);
  const cep = typeof corpo?.cep === "string" ? corpo.cep : "";
  const slugs: string[] = Array.isArray(corpo?.slugs) ? corpo.slugs.filter((s: unknown) => typeof s === "string").slice(0, 30) : [];
  const catalogo = await getCatalogo();
  const valores = slugs.map((slug) => catalogo.find((p) => p.slug === slug)?.price ?? 0).filter((v) => v > 0);
  const cotacao = await cotarFrete(cep, valores.length ? valores : [100]);
  return Response.json(cotacao);
}
