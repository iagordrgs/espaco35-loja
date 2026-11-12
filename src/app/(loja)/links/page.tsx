import type { Metadata } from "next";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { isAvailable } from "@/data/products";
import { getCatalogo } from "@/lib/estoque";
import { HORARIO, LINK_ATACADO_WHATSAPP, linkWhatsApp } from "@/lib/site";

export const metadata: Metadata = {
  title: "Links",
  description: "Pares únicos no tamanho 35: compre no site com Pix ou cartão, ou fale com a equipe no WhatsApp.",
  robots: { index: false, follow: true },
};

const MOSTRAR = 6; // pares disponíveis em destaque

// Página do link da bio do Instagram: o caminho mais curto até o par ou até a equipe.
// Só pares disponíveis agora (estoque do painel), na ordem do catálogo.
export default async function LinksPage() {
  const disponiveis = (await getCatalogo()).filter(isAvailable);
  const whatsapp = linkWhatsApp("Oi! Vim pelo Instagram da Espaço 35.");

  return (
    <main className="catalog-shell">
      <div className="catalog-topline">
        <div>
          <p className="page-kicker">Espaço 35 · só no 35</p>
          <h1 className="page-title">Seu par está aqui.</h1>
          <p className="page-intro">
            Cada modelo tem um par só: quando sai, não volta. Compre no site com Pix ou cartão, a qualquer hora, ou fale com a equipe ({HORARIO}).
          </p>
        </div>
      </div>

      <div className="hero-actions">
        <Link href="/produtos" className="button button-dark">{disponiveis.length > 0 ? `Ver a coleção (${disponiveis.length} disponíveis)` : "Ver a coleção"} <span aria-hidden="true">↗</span></Link>
        <a href={whatsapp} target="_blank" rel="noopener noreferrer" className="button button-outline">Falar no WhatsApp <span aria-hidden="true">↗</span></a>
      </div>

      {disponiveis.length > 0 && (
        <div className="products-grid" style={{ marginTop: 28 }}>
          {disponiveis.slice(0, MOSTRAR).map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      )}

      <p className="page-intro" style={{ marginTop: 28 }}>
        Revende? Atacado a partir de 6 peças:{" "}
        <a href={LINK_ATACADO_WHATSAPP} target="_blank" rel="noopener noreferrer">fale com a equipe de vendas ↗</a>
        {" · "}
        <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>
      </p>
    </main>
  );
}
