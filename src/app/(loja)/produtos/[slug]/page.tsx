import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import AddToCart from "@/components/AddToCart";
import ProductCard from "@/components/ProductCard";
import ProductGallery from "@/components/ProductGallery";
import ShareProduct from "@/components/ShareProduct";
import AtacadoChamada from "@/components/AtacadoChamada";
import { formatPrice, getProduct, getProductsByCategory, isAvailable, products } from "@/data/products";
import { getCatalogo } from "@/lib/estoque";
import { WHATSAPP_EXIBIDO, linkWhatsApp } from "@/lib/site";

export function generateStaticParams() {
  return products.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return {};
  const title = `${product.name} · ${product.brand} · tam. 35`;
  const description = `${product.description} ${formatPrice(product.price)} — par único, novo e com caixa. Cód. ${product.code}.`;
  return {
    title,
    description,
    openGraph: { title, description, images: product.images.map((image) => ({ url: image })) },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalogo = await getCatalogo();
  const product = getProduct(slug, catalogo);
  if (!product) notFound();

  const related = getProductsByCategory(product.category, catalogo)
    .filter((item) => item.slug !== product.slug && isAvailable(item))
    .slice(0, 4);
  const whatsAppLink = linkWhatsApp(`Olá! Vim pelo site e quero saber se ainda está disponível o par ${product.name} (${product.code}), tamanho 35.`);

  return (
    <main className="detail-shell">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/">Início</Link> <span aria-hidden="true">/</span> <Link href="/produtos">Coleção</Link> <span aria-hidden="true">/</span> <span>{product.name}</span>
      </nav>
      <div className="detail-grid">
        <ProductGallery images={product.images} alt={product.name} esgotado={product.soldOut} />
        <div className="detail-info">
          <div className="detail-brandline"><span>{product.brand}</span><span className="detail-code">Cód. {product.code}</span></div>
          <h1 className="detail-title">{product.name}</h1>
          <div className="detail-rating"><span className="rating-stars" aria-hidden="true">E35</span> Novo · original · com caixa</div>
          <div className="detail-price">
            {product.compareAtPrice != null && <s>{formatPrice(product.compareAtPrice)}</s>}
            <strong>{formatPrice(product.price)}</strong>
          </div>
          <p className="detail-description">{product.description}</p>

          <ShareProduct productName={product.name} />

          <AddToCart product={product} />

          {isAvailable(product) && (
            <a href={whatsAppLink} target="_blank" rel="noopener noreferrer" className="button button-outline" style={{ width: "100%", marginTop: 9 }}>
              Consultar disponibilidade no WhatsApp <span>↗</span>
            </a>
          )}
          <div className="detail-assurances">
            <span><b>✓</b> Par único disponível no tamanho 35</span>
            <span><b>✓</b> Pagamento e envio combinados no atendimento</span>
            <span><b>✓</b> Atendimento em Fortaleza e envio para todo o Brasil</span>
          </div>
          <AtacadoChamada variante="aviso" />
          <p className="detail-policy">
            O frete é combinado pelo WhatsApp. Você pode desistir da compra em até 7 dias após receber o pedido. <Link href="/trocas-e-devolucoes">Saiba mais</Link> · dúvidas? {WHATSAPP_EXIBIDO}.
          </p>
        </div>
      </div>

      {related.length > 0 && (
        <section className="related-products">
          <div className="section-heading">
            <div><span className="eyebrow">Mais da coleção</span><h2>Outros pares para conhecer.</h2></div>
            <Link className="section-link" href="/produtos">Ver coleção <span>↗</span></Link>
          </div>
          <div className="products-grid">{related.map((item) => <ProductCard key={item.slug} product={item} />)}</div>
        </section>
      )}
    </main>
  );
}
