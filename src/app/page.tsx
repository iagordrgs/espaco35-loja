import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import Reveal from "@/components/Reveal";
import { getFeatured } from "@/data/products";
import { INSTAGRAM } from "@/lib/site";

const categories = [
  { label: "Sandálias", href: "/produtos?categoria=sandalias", image: "/imagens/espaco35-68.jpg", alt: "Sandália feminina em couro caramelo" },
  { label: "Tênis", href: "/produtos?categoria=tenis", image: "/imagens/espaco35-73.jpg", alt: "Tênis casual feminino" },
  { label: "Sapatos", href: "/produtos?categoria=sapatos", image: "/imagens/espaco35-36.jpg", alt: "Sapato feminino da coleção" },
];

const socialPhotos = [16, 32, 45, 47, 63, 55];
const featured = getFeatured().slice(0, 8);

export default function Home() {
  return (
    <>
      <section className="home-hero">
        <div className="hero-inner">
          <div className="hero-copy">
              <span className="eyebrow">O seu número. A sua curadoria.</span>
              <h1>O 35 tem um lugar <span>só dele.</span></h1>
              <p>Uma seleção de calçados femininos novos e originais, escolhidos para quem sabe exatamente o número que procura.</p>
              <div className="hero-actions">
                <Link href="/produtos" className="button button-dark">Conheça a coleção <span aria-hidden="true">↗</span></Link>
                <Link href="/produtos#busca" className="button button-outline">Encontre seu par</Link>
              </div>
              <div className="hero-proof"><strong>Mississipi · Pink Cats · Campesí</strong><span className="proof-dot" />Novos, originais e com caixa</div>
          </div>
          <div className="hero-art">
            <Image src="/imagens/espaco35-68.jpg" alt="Sandália marrom de salto bloco vestida por uma modelo" fill priority sizes="(max-width: 720px) 100vw, 58vw" />
          </div>
        </div>
      </section>

      <section className="trust-strip" aria-label="Diferenciais Espaço 35">
        <div className="trust-item"><span className="trust-icon" aria-hidden="true">35</span><span><strong>Especialistas no 35</strong>Uma seleção feita pra você</span></div>
        <div className="trust-item"><span className="trust-icon" aria-hidden="true">✳</span><span><strong>Novos e originais</strong>Com caixa e procedência</span></div>
        <div className="trust-item"><span className="trust-icon" aria-hidden="true">↗</span><span><strong>Enviamos para o Brasil</strong>Frete combinado no pedido</span></div>
        <div className="trust-item"><span className="trust-icon" aria-hidden="true">♡</span><span><strong>Atendimento próximo</strong>Pedido finalizado no WhatsApp</span></div>
      </section>

      <section className="home-section section-shell">
        <Reveal className="section-heading">
          <div><span className="eyebrow">Escolha seu estilo</span><h2>Encontre o seu caminho.</h2></div>
          <Link className="section-link" href="/produtos">Ver todas as categorias <span>↗</span></Link>
        </Reveal>
        <div className="category-grid">
          {categories.map((category, index) => (
            <Reveal key={category.label} delay={index * 0.06} className="category-grid-item">
              <Link href={category.href} className="category-card">
                <Image src={category.image} alt={category.alt} fill sizes="(max-width: 720px) 50vw, 35vw" />
                <span className="category-card-copy"><strong>{category.label}</strong><span aria-hidden="true">↗</span></span>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="home-section home-feature section-shell">
        <Reveal className="section-heading">
          <div><span className="eyebrow">Uma seleção Espaço 35</span><h2>Escolhas que ficam.</h2></div>
          <Link className="section-link" href="/produtos">Descubra mais pares <span>↗</span></Link>
        </Reveal>
        <div className="products-grid">
          {featured.map((product) => <ProductCard key={product.slug} product={product} />)}
        </div>
      </section>

      <section className="brand-story">
        <div className="brand-story-inner">
          <Reveal className="brand-story-copy">
            <span className="eyebrow eyebrow-light">Uma loja feita para o seu número</span>
            <h2>Procurar menos. Encontrar melhor.</h2>
            <p>A Espaço 35 nasceu para reunir modelos que nem sempre aparecem por aí no número 35. Uma curadoria pequena, direta e feita com atenção a cada par.</p>
            <Link href="/produtos" className="button button-light">Explore a coleção <span>↗</span></Link>
          </Reveal>
          <div className="brand-story-art"><Image src="/imagens/espaco35-66.jpg" alt="Sandália caramelo com aplicações metálicas em uma modelo" fill sizes="(max-width: 720px) 90vw, 45vw" /></div>
        </div>
      </section>

      <section className="home-section instagram-section section-shell">
        <Reveal className="section-heading">
          <div><span className="eyebrow">Por aí, no seu dia a dia</span><h2>Espaço 35 em movimento.</h2></div>
          <a className="section-link" href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer">Siga @espaco35calcados <span>↗</span></a>
        </Reveal>
        <div className="instagram-grid">
          {socialPhotos.map((number) => (
            <a key={number} href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer" className="instagram-tile" aria-label="Ver Espaço 35 no Instagram">
              <Image src={`/imagens/espaco35-${String(number).padStart(2, "0")}.jpg`} alt="Calçado da coleção Espaço 35" fill sizes="(max-width: 720px) 33vw, 16vw" />
            </a>
          ))}
        </div>
        <p className="instagram-caption">Inspiração pra acompanhar cada passo. <a href={`https://instagram.com/${INSTAGRAM}`} target="_blank" rel="noopener noreferrer">@{INSTAGRAM} ↗</a></p>
      </section>
    </>
  );
}
