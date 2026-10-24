import type { Product } from "@/data/products";

// Situação de um par vinda do banco. Só entram aqui os pares que NÃO estão disponíveis.
export type SituacaoPar = { status: "reservado" | "vendido"; ate: string | null };
export type MapaEstoque = Record<string, SituacaoPar>;

// Reserva manual com prazo vencido conta como disponível (o banco faz a mesma conta).
export function situacaoAtual(mapa: MapaEstoque, slug: string, agora = Date.now()): "disponivel" | "reservado" | "vendido" {
  const par = mapa[slug];
  if (!par) return "disponivel";
  if (par.status === "reservado" && par.ate && new Date(par.ate).getTime() < agora) return "disponivel";
  return par.status;
}

// Junta o catálogo (products.ts) com o estoque do painel. O soldOut do products.ts continua valendo.
export function aplicarEstoque(produto: Product, mapa: MapaEstoque, agora = Date.now()): Product {
  const situacao = situacaoAtual(mapa, produto.slug, agora);
  if (situacao === "vendido") return { ...produto, soldOut: true };
  if (situacao === "reservado") return { ...produto, reserved: true };
  return produto;
}
