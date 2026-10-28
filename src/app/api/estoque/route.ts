import { products } from "@/data/products";
import { getEstoque } from "@/lib/estoque";
import { aplicarEstoque } from "@/lib/estoque-regras";

export const dynamic = "force-dynamic";

// Situação dos pares por código interno (E35-001...), para o catálogo restrito ler o estoque do painel.
// Só saem os pares que NÃO estão disponíveis: { "E35-010": "vendido", "E35-023": "reservado" }.
// Sem dado de cliente. Liberado para qualquer origem (o catálogo mora em outro endereço).
export async function GET() {
  const mapa = await getEstoque();
  const agora = Date.now();
  const porCodigo: Record<string, "vendido" | "reservado"> = {};
  for (const p of products) {
    const atual = aplicarEstoque(p, mapa, agora);
    if (atual.soldOut) porCodigo[p.code] = "vendido";
    else if (atual.reserved) porCodigo[p.code] = "reservado";
  }
  return Response.json(porCodigo, {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "no-store" },
  });
}
