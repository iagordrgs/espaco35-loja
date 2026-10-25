import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LimparSacola from "@/components/LimparSacola";
import { reais, type ItemPedido } from "@/lib/painel";
import { WHATSAPP_EXIBIDO, linkWhatsApp } from "@/lib/site";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Seu pedido", robots: { index: false, follow: false } };

// Página para onde o Mercado Pago devolve a cliente. O endereço usa o código público (aleatório) do pedido,
// então ninguém vê o pedido de outra pessoa trocando um número.
export default async function PedidoPage({ params, searchParams }: { params: Promise<{ codigo: string }>; searchParams: Promise<{ status?: string; collection_status?: string }> }) {
  const { codigo } = await params;
  const { status: voltaStatus, collection_status } = await searchParams;
  if (!/^[0-9a-f-]{36}$/i.test(codigo)) notFound();
  const admin = supabaseAdmin();
  if (!admin) notFound();
  const { data: p } = await admin.from("pedidos").select("id,status,itens,frete,total,entrega,pagamento_status").eq("codigo_publico", codigo).maybeSingle();
  if (!p) notFound();

  const retorno = collection_status ?? voltaStatus;
  const pago = ["pago", "enviado", "entregue"].includes(p.status) || retorno === "approved";
  const aguardando = !pago && p.status === "novo" && (retorno === "pending" || retorno === "in_process" || p.pagamento_status === "pending" || !retorno);
  const ajuda = linkWhatsApp(`Olá! Fiz o pedido #${p.id} pelo site e queria falar sobre ele.`);

  return (
    <main className="page-center pedido-retorno">
      {(pago || aguardando) && <LimparSacola />}
      <span className="empty-mark" aria-hidden="true">{pago ? "✓" : aguardando ? "…" : "!"}</span>
      <h1>{pago ? "Pagamento aprovado!" : aguardando ? "Aguardando o pagamento" : "O pagamento não foi concluído"}</h1>
      <p>
        {pago
          ? `Recebemos seu pedido #${p.id}. A equipe da Espaço 35 já foi avisada e vai separar seus pares para envio. Você recebe o acompanhamento pelo WhatsApp.`
          : aguardando
            ? `Seu pedido #${p.id} está reservado por 30 minutos. Se pagou com Pix, a confirmação chega em instantes: atualize esta página.`
            : `Os pares do pedido #${p.id} voltaram para a loja. Você pode tentar de novo ou finalizar com a nossa equipe pelo WhatsApp.`}
      </p>
      <ul className="pedido-resumo">
        {(p.itens as ItemPedido[]).map((i) => <li key={i.slug}><span>{i.nome}</span><strong>{reais(i.preco)}</strong></li>)}
        <li><span>Frete · {p.entrega}</span><strong>{reais(p.frete)}</strong></li>
        <li className="total"><span>Total</span><strong>{reais(p.total)}</strong></li>
      </ul>
      <div className="hero-actions" style={{ justifyContent: "center" }}>
        {pago || aguardando ? <Link href="/produtos" className="button button-dark">Continuar na loja <span>↗</span></Link> : <Link href="/carrinho" className="button button-dark">Voltar à sacola <span>↗</span></Link>}
        <a href={ajuda} target="_blank" rel="noopener noreferrer" className="button button-outline">Falar no WhatsApp</a>
      </div>
      <p className="checkout-hint">Dúvidas? WhatsApp {WHATSAPP_EXIBIDO}.</p>
    </main>
  );
}
