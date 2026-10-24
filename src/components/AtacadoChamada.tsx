import { ATACADO_MINIMO } from "@/data/products";
import { LINK_ATACADO_WHATSAPP, LINK_INSTAGRAM } from "@/lib/site";

// Chamada para revenda. O preço de atacado não aparece no site: a equipe de vendas passa pelo WhatsApp/Instagram.
// "banner" vai na home; "aviso" é a versão compacta da página do produto.
export default function AtacadoChamada({ variante }: { variante: "banner" | "aviso" }) {
  if (variante === "aviso") {
    return (
      <aside className="atacado-aviso" aria-label="Compra no atacado">
        <strong>Revenda? Atacado a partir de {ATACADO_MINIMO} peças.</strong>
        <span>Preços especiais com a nossa equipe de vendas.</span>
        <span className="atacado-aviso-links">
          <a href={LINK_ATACADO_WHATSAPP} target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>
          <a href={LINK_INSTAGRAM} target="_blank" rel="noopener noreferrer">Instagram ↗</a>
        </span>
      </aside>
    );
  }

  return (
    <section className="atacado-banner" aria-label="Compra no atacado">
      <div className="atacado-banner-inner">
        <div className="atacado-banner-numero" aria-hidden="true">{ATACADO_MINIMO}+</div>
        <div className="atacado-banner-texto">
          <span className="eyebrow eyebrow-light">Para lojistas e revendedoras</span>
          <h2>Atacado a partir de {ATACADO_MINIMO} peças.</h2>
          <p>Monte seu pedido com modelos diferentes e receba a tabela de atacado com preços especiais. Fale com a nossa equipe de vendas.</p>
        </div>
        <div className="atacado-banner-acoes">
          <a href={LINK_ATACADO_WHATSAPP} target="_blank" rel="noopener noreferrer" className="button button-red">Falar no WhatsApp <span aria-hidden="true">↗</span></a>
          <a href={LINK_INSTAGRAM} target="_blank" rel="noopener noreferrer" className="button button-outline-light">Chamar no Instagram <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  );
}
