import Link from "next/link";

const WA = "https://wa.me/5585992442091";
const IG = "https://instagram.com/espaco35calcados";

export default function Footer() {
  return (
    <footer className="bg-foreground text-[#E9E3DB]">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <span className="font-serif text-xl tracking-[0.18em] text-white">
              ESPAÇO 35
            </span>
            <p className="mt-4 text-[13.5px] leading-7 text-[#C9C0B5]">
              Loja de calçados femininos, só tamanho 35. Modelos novos e
              originais, com caixa — Mississipi, Pink Cats e Campesí.
            </p>
          </div>

          <div>
            <h4 className="font-serif text-lg text-white">Categorias</h4>
            <ul className="mt-4 space-y-2 text-[13.5px] text-[#C9C0B5]">
              <li><Link href="/produtos?categoria=sandalias" className="hover:text-brand">Sandálias</Link></li>
              <li><Link href="/produtos?categoria=tenis" className="hover:text-brand">Tênis</Link></li>
              <li><Link href="/produtos?categoria=sapatos" className="hover:text-brand">Sapatos</Link></li>
              <li><Link href="/produtos" className="hover:text-brand">Toda a coleção</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg text-white">Contato</h4>
            <ul className="mt-4 space-y-2 text-[13.5px] text-[#C9C0B5]">
              <li>Fortaleza – CE</li>
              <li><a href={IG} target="_blank" rel="noopener noreferrer" className="hover:text-brand">@espaco35calcados</a></li>
              <li>Seg a Sáb · 9h às 18h</li>
            </ul>
          </div>

          <div>
            <h4 className="font-serif text-lg text-white">Fale com a gente</h4>
            <p className="mt-4 text-[13.5px] leading-7 text-[#C9C0B5]">
              Tire dúvidas e garanta seu par direto pelo WhatsApp.
            </p>
            <a
              href={WA}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block rounded-full bg-brand px-6 py-3 text-[13px] font-semibold text-white transition hover:bg-brand-dark"
            >
              Chamar no WhatsApp
            </a>
          </div>
        </div>

        <div className="mt-14 border-t border-[var(--line)] pt-6 text-center text-[12px] tracking-wide text-[#9a9087]">
          © {new Date().getFullYear()} Espaço 35 · Pares originais, novos e com
          caixa · Sujeito a disponibilidade
        </div>
      </div>
    </footer>
  );
}
