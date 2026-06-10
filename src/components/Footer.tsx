import Link from "next/link";
import { categories } from "@/data/products";

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-brand/25 bg-card text-foreground/80">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <div className="flex items-baseline gap-2">
            <span className="font-extrabold tracking-[0.25em]">ESPAÇO</span>
            <span className="font-extrabold tracking-[0.25em] text-brand">
              35
            </span>
          </div>
          <p className="mt-3 text-sm text-foreground/60">
            Calçados femininos · exclusivamente tamanho 35. Pares novos,
            originais e com caixa.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">
            Categorias
          </h3>
          <ul className="mt-3 space-y-2 text-sm">
            {categories.map((c) => (
              <li key={c.key}>
                <Link
                  href={`/produtos?categoria=${c.key}`}
                  className="text-foreground/60 transition hover:text-brand"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">
            Atendimento
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-foreground/60">
            <li>
              <a
                href="https://wa.me/5585992442091"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-brand"
              >
                WhatsApp (85) 99244-2091
              </a>
            </li>
            <li>
              <a
                href="https://instagram.com/espaco35calcados"
                target="_blank"
                rel="noopener noreferrer"
                className="transition hover:text-brand"
              >
                @espaco35calcados
              </a>
            </li>
            <li>Fortaleza – CE</li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-foreground/40">
        © {new Date().getFullYear()} Espaço 35 · Pares originais, novos e com
        caixa · Sujeito a disponibilidade
      </div>
    </footer>
  );
}
