import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import CategoryShowcase, { type ShowcaseItem } from "@/components/home/CategoryShowcase";
import HeroCampaign from "@/components/home/HeroCampaign";
import ProductRail from "@/components/home/ProductRail";
import StoryParallax from "@/components/home/StoryParallax";
import { getFeatured, getProductsByCategory, isAvailable, type Product } from "@/data/products";
import { getCatalogo } from "@/lib/estoque";

const countAvailable = (catalogo: Product[], category: "sandalias" | "tenis" | "sapatos") =>
  getProductsByCategory(category, catalogo).filter(isAvailable).length;

const showcaseBase: Omit<ShowcaseItem, "count">[] = [
  { key: "sandalias", label: "Sandálias", href: "/produtos?categoria=sandalias", image: "/campanha/sandalias.jpg", alt: "Sandália dourada de tiras finas em um terraço ensolarado", caption: "Rasteiras, saltos e flatforms para o verão inteiro." },
  { key: "tenis", label: "Tênis", href: "/produtos?categoria=tenis", image: "/campanha/tenis.jpg", alt: "Tênis bege matelassê atravessando a faixa de pedestres", caption: "Conforto de todo dia, sem abrir mão do estilo." },
  { key: "sapatos", label: "Sapatos", href: "/produtos?categoria=sapatos", image: "/campanha/sapatos.jpg", alt: "Slingback prata com biqueira dourada sobre pedestal e fundo vermelho", caption: "Scarpins, mules e mocassins para ocasiões que pedem mais." },
];

const ticker = ["Tamanho 35", "Peças únicas", "Novos e originais", "Enviamos para todo o Brasil", "Atendimento pelo WhatsApp", "Mississipi · Pink Cats · Campesí"];

export default async function Home() {
  const catalogo = await getCatalogo();
  const featured = getFeatured(catalogo).slice(0, 10);
  const showcase: ShowcaseItem[] = showcaseBase.map((item) => ({ ...item, count: countAvailable(catalogo, item.key as "sandalias" | "tenis" | "sapatos") }));

  return (
    <>
      <HeroCampaign />

      <div className="ticker" aria-label="Diferenciais Espaço 35">
        <div className="ticker-track">
          {[0, 1].map((copy) => (
            <ul key={copy} aria-hidden={copy === 1 ? "true" : undefined}>
              {ticker.map((item) => <li key={item}>{item}</li>)}
            </ul>
          ))}
        </div>
      </div>

      <section className="home-section section-shell">
        <Reveal className="section-heading">
          <div><span className="eyebrow">Escolha seu estilo</span><h2>Encontre o seu caminho.</h2></div>
          <Link className="section-link" href="/produtos">Toda a coleção <span>↗</span></Link>
        </Reveal>
        <CategoryShowcase items={showcase} />
      </section>

      <section id="vitrine" className="home-section home-feature">
        <Reveal className="section-heading section-shell">
          <div><span className="eyebrow">Uma seleção Espaço 35</span><h2>Escolhas que ficam.</h2></div>
          <Link className="section-link" href="/produtos">Descubra mais pares <span>↗</span></Link>
        </Reveal>
        <ProductRail label="Destaques da coleção, arraste para o lado">
          {featured.map((product) => (
            <div key={product.slug} className="rail-item"><ProductCard product={product} reveal={false} /></div>
          ))}
        </ProductRail>
      </section>

      <StoryParallax />
    </>
  );
}
