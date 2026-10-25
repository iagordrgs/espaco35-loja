"use client";

import Link from "next/link";
import { useState } from "react";
import AvisoIndisponiveis from "@/components/AvisoIndisponiveis";
import PagamentoOnline from "@/components/checkout/PagamentoOnline";
import { useCart } from "@/context/CartContext";
import { formatPrice, type Product } from "@/data/products";
import { WHATSAPP_EXIBIDO, linkWhatsApp } from "@/lib/site";

function buildMessage(products: Product[], total: number): string {
  const lines = products.map((product) => `• ${product.name} (cód. ${product.code}, tam. ${product.sizes[0]}) — ${formatPrice(product.price)}`);
  return ["Olá! Vim pelo site Espaço 35 e quero fazer este pedido:", ...lines, `Subtotal: ${formatPrice(total)}`, "Como combinamos frete e pagamento?"].join("\n");
}

export default function CheckoutCliente({ pagamentoOnline, freteFortaleza }: { pagamentoOnline: boolean; freteFortaleza: number }) {
  const { hydrated, products, unavailable, totalPrice, clear } = useCart();
  const [openedWhatsApp, setOpenedWhatsApp] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  if (!hydrated) return <main className="page-center" aria-busy="true" />;

  if (confirmed) {
    return (
      <main className="page-center">
        <span className="empty-mark" aria-hidden="true">✓</span>
        <h1>Pedido encaminhado.</h1>
        <p>Obrigada por escolher a Espaço 35. A loja responde pelo WhatsApp {WHATSAPP_EXIBIDO}, de segunda a sábado, das 9h às 18h.</p>
        <Link href="/produtos" className="button button-dark">Voltar à loja <span>↗</span></Link>
      </main>
    );
  }

  if (products.length === 0) {
    return (
      <main className="page-center">
        {unavailable.length > 0 && <div className="mb-8 text-left"><AvisoIndisponiveis /></div>}
        <span className="empty-mark" aria-hidden="true">35</span>
        <h1>Não há pares para finalizar.</h1>
        <p>Seu pedido fica pronto depois que você escolher um par da coleção.</p>
        <Link href="/produtos" className="button button-dark">Ver coleção <span>↗</span></Link>
      </main>
    );
  }

  const messageLink = linkWhatsApp(buildMessage(products, totalPrice));

  return (
    <main className="cart-shell">
      <div className="checkout-intro">
        <p className="page-kicker">{pagamentoOnline ? "Finalizar compra" : "Finalização assistida"}</p>
        <h1>Seu pedido, quase lá.</h1>
        <p>{pagamentoOnline
          ? "Pague agora com Pix ou cartão e receba em casa, ou, se preferir, finalize conversando com a nossa equipe pelo WhatsApp."
          : "Vamos abrir uma conversa com a loja e preencher uma mensagem com os pares escolhidos. Você só conclui o pedido quando tocar em enviar no WhatsApp."}</p>
      </div>
      {unavailable.length > 0 && <div style={{ marginTop: 18 }}><AvisoIndisponiveis /></div>}
      {pagamentoOnline && <PagamentoOnline products={products} freteFortaleza={freteFortaleza} />}
      <section className="checkout-card">
        <h2>{pagamentoOnline ? "Prefere finalizar pelo WhatsApp?" : "Confira seu pedido"}</h2>
        <ul className="checkout-items">
          {products.map((product) => (
            <li key={product.slug} className="checkout-item">
              <span>{product.name} · {product.code} · tamanho {product.sizes[0]}</span>
              <strong>{formatPrice(product.price)}</strong>
            </li>
          ))}
        </ul>
        <div className="summary-line" style={{ marginTop: 20, paddingTop: 15, borderTop: "1px solid #deddda" }}><span>Frete</span><span>A combinar</span></div>
        <div className="summary-total"><span>Subtotal dos pares</span><strong>{formatPrice(totalPrice)}</strong></div>
        <a href={messageLink} target="_blank" rel="noopener noreferrer" onClick={() => setOpenedWhatsApp(true)} className={`button ${pagamentoOnline ? "button-outline" : "button-red"}`}>Abrir conversa no WhatsApp <span>↗</span></a>
        <p className="checkout-hint">{pagamentoOnline ? "Nesta opção, frete e pagamento são combinados com a equipe pelo WhatsApp." : "O frete e o pagamento são combinados com a loja. Nada é cobrado por este site."}</p>
        {openedWhatsApp && (
          <div className="checkout-confirmation" role="status">
            <strong>O WhatsApp foi aberto com sua mensagem pronta.</strong>
            <p>Confira o pedido na conversa e toque em enviar. O pedido ainda não foi enviado até você fazer isso.</p>
            <button type="button" onClick={() => { clear(); setConfirmed(true); }} className="text-button">Já enviei a mensagem</button>
          </div>
        )}
      </section>
      <Link href="/carrinho" className="continue-link">Voltar à sacola</Link>
    </main>
  );
}
