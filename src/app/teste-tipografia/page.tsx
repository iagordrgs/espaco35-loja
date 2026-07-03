import type { Metadata } from "next";
import Link from "next/link";
import { Fraunces } from "next/font/google";
import { getFeatured, formatPrice } from "@/data/products";

/*
 * ─────────────────────────────────────────────────────────────
 *  PÁGINA EXPERIMENTAL — TESTE DE TIPOGRAFIA (serifada display)
 *  Não é linkada em lugar nenhum do site. Para ver, acesse:
 *  https://espaco35-loja.vercel.app/teste-tipografia
 *  Para remover o teste, basta apagar esta pasta.
 * ─────────────────────────────────────────────────────────────
 */

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
});

const VERDE = "#1d7a4b";

export const metadata: Metadata = {
  title: "Teste de tipografia (experimental)",
  robots: { index: false, follow: false },
};

export default function TesteTipografia() {
  const destaques = getFeatured().slice(0, 3);

  return (
    <div className={`${fraunces.variable} mx-auto max-w-4xl px-4 py-12`}>
      <p className="rounded-lg bg-[#FEC705]/20 px-4 py-2 text-sm">
        🧪 <b>Página experimental</b> — teste da fonte serifada (Fraunces) com
        destaque em itálico verde. Não aparece no site. Compare com a home e
        diga o que achou.
      </p>

      {/* HERO no estilo da referência */}
      <section className="mt-12">
        <h1
          className="text-5xl font-semibold leading-tight sm:text-6xl"
          style={{ fontFamily: "var(--font-fraunces)" }}
        >
          Sapato bonito no 35{" "}
          <em style={{ color: VERDE }}>a gente tem.</em>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-foreground/80">
          Modelos novos e originais das marcas Mississipi, Pink Cats e Campesí.
          Poucas unidades de cada par — viu, gostou,{" "}
          <em
            style={{ fontFamily: "var(--font-fraunces)", color: VERDE }}
            className="font-semibold"
          >
            é seu.
          </em>
        </p>
      </section>

      {/* Títulos de seção comparados */}
      <section className="mt-16 grid gap-8 sm:grid-cols-2">
        <div className="rounded-xl border border-[var(--line)] bg-card p-6">
          <span className="text-xs uppercase tracking-widest text-muted">
            Hoje (Manrope)
          </span>
          <h2 className="mt-2 text-2xl font-bold">Destaques da semana</h2>
          <p className="mt-2 text-sm text-muted">
            De R$ 100,00 por R$ 69,90 · tamanho 35
          </p>
        </div>
        <div className="rounded-xl border border-[var(--line)] bg-card p-6">
          <span className="text-xs uppercase tracking-widest text-muted">
            Teste (Fraunces)
          </span>
          <h2
            className="mt-2 text-2xl font-semibold"
            style={{ fontFamily: "var(--font-fraunces)" }}
          >
            Destaques da <em style={{ color: VERDE }}>semana</em>
          </h2>
          <p className="mt-2 text-sm text-muted">
            De R$ 100,00 por R$ 69,90 · tamanho 35
          </p>
        </div>
      </section>

      {/* Nomes de produto na fonte de teste */}
      <section className="mt-12">
        <h3 className="text-sm uppercase tracking-widest text-muted">
          Nomes de produto na fonte de teste
        </h3>
        <ul className="mt-4 space-y-3">
          {destaques.map((p) => (
            <li key={p.slug} className="flex items-baseline justify-between">
              <span
                className="text-xl"
                style={{ fontFamily: "var(--font-fraunces)" }}
              >
                {p.name}
              </span>
              <span className="font-bold text-brand">
                {formatPrice(p.price)}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <Link
        href="/"
        className="mt-16 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
      >
        ← Voltar pra home (fonte atual)
      </Link>
    </div>
  );
}
