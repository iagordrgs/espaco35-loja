"use client";

import Link from "next/link";
import { useState } from "react";
import AvisoIndisponiveis from "@/components/AvisoIndisponiveis";
import { useCart } from "@/context/CartContext";
import { formatPrice, type Product } from "@/data/products";
import { WHATSAPP_EXIBIDO, linkWhatsApp } from "@/lib/site";

function montarMensagem(products: Product[], total: number): string {
  const linhas = products.map(
    (p) =>
      `• ${p.name} (Cód. ${p.code}, tam. ${p.sizes[0]}) — ${formatPrice(p.price)}`
  );
  return [
    "Oi! 💛 Quero fechar meu pedido do site:",
    ...linhas,
    `Total: ${formatPrice(total)}`,
    "Como faço o pagamento e o envio?",
  ].join("\n");
}

export default function CheckoutPage() {
  const { hydrated, products, unavailable, totalPrice, clear } = useCart();
  const [abriu, setAbriu] = useState(false); // clicou no botão: o WhatsApp foi aberto com o pedido
  const [enviado, setEnviado] = useState(false); // a cliente confirmou que mandou a mensagem

  // Antes de ler o carrinho do celular não dá para dizer que ele está vazio.
  if (!hydrated) return <div className="min-h-[50vh]" aria-busy="true" />;

  if (enviado) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="text-5xl">💬</div>
        <h1 className="mt-4 text-2xl font-bold">Pedido enviado! 💛</h1>
        <p className="mt-2 text-muted">
          A gente responde rapidinho — Seg a Sáb, 9h às 18h. Qualquer coisa,
          chama no {WHATSAPP_EXIBIDO}.
        </p>
        <Link
          href="/produtos"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
        >
          Voltar à loja
        </Link>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        {unavailable.length > 0 ? (
          <div className="mb-8 text-left">
            <AvisoIndisponiveis />
          </div>
        ) : null}
        <h1 className="text-2xl font-bold">Nada para finalizar</h1>
        <p className="mt-2 text-muted">Seu carrinho está vazio.</p>
        <Link
          href="/produtos"
          className="mt-6 inline-block rounded-full bg-brand px-6 py-3 font-semibold text-background transition hover:bg-accent"
        >
          Ver produtos
        </Link>
      </div>
    );
  }

  const url = linkWhatsApp(montarMensagem(products, totalPrice));

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-3xl font-bold">Fechar pedido</h1>
      <p className="mt-2 text-muted">
        A compra é finalizada no nosso WhatsApp: você envia o pedido pronto e a
        gente combina pagamento e envio com você. Rapidinho e sem cadastro.
      </p>
      <p className="mt-2 text-sm text-muted">
        Você tem 7 dias para desistir da compra.{" "}
        <Link
          href="/trocas-e-devolucoes"
          className="font-medium text-brand hover:underline"
        >
          Trocas e devoluções
        </Link>
      </p>

      {unavailable.length > 0 ? (
        <div className="mt-6">
          <AvisoIndisponiveis />
        </div>
      ) : null}

      <aside className="mt-8 rounded-xl border border-[var(--line)] bg-card p-6">
        <h2 className="text-lg font-bold">Seu pedido</h2>
        <ul className="mt-4 space-y-3 text-sm">
          {products.map((p) => (
            <li key={p.slug} className="flex justify-between gap-2">
              <span className="text-muted">
                {p.name} · Cód. {p.code} · tam. {p.sizes[0]}
              </span>
              <span>{formatPrice(p.price)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-2 border-t border-[var(--line)] pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted">Frete</span>
            <span className="text-foreground/70">A combinar no WhatsApp</span>
          </div>
          <div className="flex justify-between text-lg font-bold">
            <span>Total</span>
            <span className="text-brand">{formatPrice(totalPrice)}</span>
          </div>
        </div>

        {/* Link normal (não window.open): é o jeito que menos esbarra em bloqueio de pop-up no navegador do Instagram e no iPhone. */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setAbriu(true)}
          className="mt-6 block w-full rounded-full bg-brand px-6 py-3 text-center font-semibold text-background transition hover:bg-accent"
        >
          Fechar pedido no WhatsApp
        </a>
        <p className="mt-3 text-center text-xs text-muted">
          Abre uma conversa no WhatsApp {WHATSAPP_EXIBIDO} com o pedido já
          escrito. Nada é cobrado pelo site.
        </p>

        {abriu ? (
          <div className="mt-5 rounded-xl bg-nude p-4 text-sm">
            <p className="font-semibold">Abrimos o WhatsApp com o seu pedido.</p>
            <p className="mt-1 text-muted">
              Falta só tocar em <b>enviar</b> na conversa. Se ela não abriu,
              toque no botão de novo ou chame no {WHATSAPP_EXIBIDO}.
            </p>
            <button
              type="button"
              onClick={() => {
                clear();
                setEnviado(true);
              }}
              className="mt-3 font-semibold text-brand hover:underline"
            >
              Já enviei — limpar meu carrinho
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
