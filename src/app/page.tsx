import Image from "next/image";
import Link from "next/link";
import ProductCard from "@/components/ProductCard";
import { getFeatured } from "@/data/products";

const WA =
  "https://wa.me/5585992442091?text=" +
  encodeURIComponent("Olá! Vim pelo site da Espaço 35 e quero saber mais 🤍");
const IG = "https://instagram.com/espaco35calcados";

const cats = [
  { label: "Sandálias", href: "/produtos?categoria=sandalias", img: "/imagens/espaco35-09.jpg" },
  { label: "Tênis", href: "/produtos?categoria=tenis", img: "/imagens/espaco35-17.jpg" },
  { label: "Sapatos", href: "/produtos?categoria=sapatos", img: "/imagens/espaco35-27.jpg" },
  { label: "Toda a coleção", href: "/produtos", img: "/imagens/espaco35-32.jpg" },
];

const beneficios = [
  "Exclusivo tamanho 35",
  "Originais e com caixa",
  "Poucas unidades",
  "Envio para todo o Brasil",
  "Atendimento no WhatsApp",
];

const depoimentos = [
  { txt: "Achar sapato lindo no 35 era impossível. Aqui virou meu cantinho favorito.", nome: "Marina", cidade: "Fortaleza" },
  { txt: "Chegou novinho, na caixa e exatamente como na foto. Atendimento um amor.", nome: "Letícia", cidade: "Eusébio" },
  { txt: "Curadoria impecável. Dá pra ver que cada par é escolhido com carinho.", nome: "Camila", cidade: "Caucaia" },
];

const igFotos = [16, 32, 45, 47, 63, 55];

export default function Home() {
  const featured = getFeatured().slice(0, 8);

  return (
    <div>
      {/* HERO */}
      <section className="px-6 pt-16 pb-20">
        <div className="mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">
              Boutique digital · Fortaleza
            </span>
            <h1 className="mt-6 font-serif text-4xl leading-tight sm:text-5xl">
              Calçados femininos. Exclusivamente no tamanho 35.
            </h1>
            <p className="mt-6 max-w-md text-[16.5px] text-muted">
              Curadoria de modelos novos, originais e com caixa. Poucas
              unidades de cada par — viu, gostou, é seu.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/produtos"
                className="rounded-2xl bg-foreground px-8 py-4 text-sm font-semibold tracking-wide text-background transition hover:bg-brand"
              >
                Ver coleção
              </Link>
              <a
                href={WA}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-2xl border border-[var(--line)] px-8 py-4 text-sm font-semibold tracking-wide text-foreground transition hover:bg-nude"
              >
                Falar no WhatsApp
              </a>
            </div>
          </div>
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-nude shadow-[0_30px_60px_-30px_rgba(47,41,37,0.25)]">
            <Image
              src="/imagens/espaco35-68.jpg"
              alt="Calçado feminino Espaço 35 tamanho 35"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
            <span className="absolute bottom-5 left-5 rounded-xl bg-card/90 px-4 py-2.5 text-[12.5px] tracking-wide backdrop-blur">
              Tamanho 35 · curadoria feminina
            </span>
          </div>
        </div>
      </section>

      {/* BENEFÍCIOS */}
      <div className="border-y border-[var(--line)] bg-nude">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-x-10 gap-y-3 px-6 py-6 text-[13px]">
          {beneficios.map((b) => (
            <span key={b}>
              <span className="mr-2 font-bold text-brand">✓</span>
              {b}
            </span>
          ))}
        </div>
      </div>

      {/* CATEGORIAS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Navegue</span>
          <h2 className="mt-3 font-serif text-3xl">Por categoria</h2>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {cats.map((c) => (
            <Link
              key={c.label}
              href={c.href}
              className="group relative aspect-[3/4] overflow-hidden rounded-2xl bg-nude"
            >
              <Image src={c.img} alt={c.label} fill sizes="25vw" className="object-cover transition duration-700 group-hover:scale-110" />
              <span className="absolute inset-0 bg-gradient-to-t from-foreground/55 to-transparent" />
              <span className="absolute inset-x-0 bottom-5 text-center font-serif text-lg tracking-wide text-white">
                {c.label}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* DESTAQUES */}
      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="mb-10 flex items-end justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Seleção</span>
            <h2 className="mt-3 font-serif text-3xl">Em destaque</h2>
          </div>
          <Link href="/produtos" className="text-sm font-medium text-brand hover:underline">
            Ver tudo →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.slug} product={p} />
          ))}
        </div>
      </section>

      {/* INSTITUCIONAL */}
      <section className="bg-nude">
        <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 py-24 md:grid-cols-2">
          <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-card">
            <Image src="/imagens/espaco35-66.jpg" alt="Curadoria Espaço 35" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">A marca</span>
            <h2 className="mt-4 font-serif text-3xl leading-snug">Curadoria feita para quem calça 35.</h2>
            <p className="mt-5 max-w-md text-muted">
              Selecionamos cuidadosamente cada modelo para mulheres que
              encontram dificuldade em achar calçados bonitos no tamanho 35.
            </p>
            <p className="mt-4 max-w-md text-muted">
              Todos os pares são novos, originais e enviados com caixa — das
              marcas Mississipi, Pink Cats e Campesí.
            </p>
            <Link
              href="/produtos"
              className="mt-8 inline-block rounded-2xl bg-foreground px-8 py-4 text-sm font-semibold tracking-wide text-background transition hover:bg-brand"
            >
              Ver a coleção
            </Link>
          </div>
        </div>
      </section>

      {/* DEPOIMENTOS */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">Quem comprou</span>
          <h2 className="mt-3 font-serif text-3xl">Clientes Espaço 35</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {depoimentos.map((d) => (
            <div key={d.nome} className="rounded-2xl border border-[var(--line)] bg-card p-8">
              <div className="tracking-[3px] text-brand">★★★★★</div>
              <p className="mt-4 font-serif text-lg italic">“{d.txt}”</p>
              <div className="mt-5 text-[13px] text-muted">
                <b className="font-semibold text-foreground">{d.nome}</b> · {d.cidade}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* INSTAGRAM */}
      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="mx-auto mb-10 max-w-xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand">@espaco35calcados</span>
          <h2 className="mt-3 font-serif text-3xl">Acompanhe no Instagram</h2>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {igFotos.map((n) => (
            <a
              key={n}
              href={IG}
              target="_blank"
              rel="noopener noreferrer"
              className="group relative aspect-square overflow-hidden rounded-xl bg-nude"
            >
              <Image
                src={`/imagens/espaco35-${String(n).padStart(2, "0")}.jpg`}
                alt="Espaço 35 no Instagram"
                fill
                sizes="16vw"
                className="object-cover transition duration-500 group-hover:scale-110"
              />
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
