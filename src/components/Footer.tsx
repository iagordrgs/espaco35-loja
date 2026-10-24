import Link from "next/link";
import { HORARIO, INSTAGRAM, VENDEDOR, WHATSAPP, WHATSAPP_EXIBIDO, linkWhatsApp } from "@/lib/site";

const WA = linkWhatsApp("Olá! Vim pelo site da Espaço 35 e quero conhecer a coleção.");
const IG = `https://instagram.com/${INSTAGRAM}`;

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-main">
        <div className="footer-brand">
          <Link href="/" className="footer-wordmark">ESPAÇO <span>35</span></Link>
          <p>Calçados femininos para quem sempre calça 35. Uma curadoria de pares novos, originais e com caixa.</p>
        </div>
        <div className="footer-column">
          <h2>Explore</h2>
          <Link href="/produtos">Toda a coleção</Link>
          <Link href="/produtos?categoria=sandalias">Sandálias</Link>
          <Link href="/produtos?categoria=tenis">Tênis</Link>
          <Link href="/produtos?categoria=sapatos">Sapatos</Link>
          <Link href="/favoritos">Seus favoritos</Link>
        </div>
        <div className="footer-column">
          <h2>Atendimento</h2>
          <span>Fortaleza · Ceará</span>
          <span>{HORARIO}</span>
          <a href={`tel:+${WHATSAPP}`}>{WHATSAPP_EXIBIDO}</a>
          <a href={IG} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        </div>
        <div className="footer-contact">
          <span className="eyebrow eyebrow-light">Fale com a gente</span>
          <p>Escolheu seu par? A gente combina pagamento e envio com você, direto pelo WhatsApp.</p>
          <a href={WA} target="_blank" rel="noopener noreferrer" className="button button-light">Chamar no WhatsApp <span>↗</span></a>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="footer-legal">
          <Link href="/trocas-e-devolucoes">Trocas e devoluções</Link>
          <span>© {new Date().getFullYear()} Espaço 35</span>
        </div>
        {VENDEDOR.nomeEmpresarial && VENDEDOR.documento ? (
          <p>{VENDEDOR.nomeEmpresarial} · {VENDEDOR.documento}{VENDEDOR.endereco ? ` · ${VENDEDOR.endereco}` : ""}{VENDEDOR.email ? ` · ${VENDEDOR.email}` : ""}</p>
        ) : null}
        <span className="footer-note">Par único · tamanho 35 · sujeito à disponibilidade</span>
      </div>
    </footer>
  );
}
