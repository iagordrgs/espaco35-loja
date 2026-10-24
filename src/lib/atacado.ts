import "server-only";
import type { Category } from "@/data/products";

// Tabela de atacado (preço por par, a partir de ATACADO_MINIMO pares). Usada só pelo time de vendas no painel:
// "server-only" garante que estes valores nunca vão para o navegador de quem visita o site.
export const PRECO_ATACADO: Record<Category, number> = {
  tenis: 109.9,
  sapatos: 99.9,
  sandalias: 89.9,
  botas: 99.9,
};
