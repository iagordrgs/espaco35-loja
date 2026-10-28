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
  const { data: p } = await admin.from("pedidos").select("id,status,itens,frete,total,entrega,pagamento_status,origem,expira_em").eq("codigo_publico", codigo).maybeSingle();
  if (!p) notFound();

  // A situação vem só do banco (atualizado pelo aviso assinado do Mercado Pago). O status no endereço da volta
  // (collection_status) pode ser editado por qualquer um: serve só para mostrar "confirmando" enquanto o aviso chega.
  const retorno = collection_status ?? voltaStatus;
  const pago = ["pago", "enviado", "entregue"].includes(p.status);
  const aguardando = !pago && p.status === "novo";
  const confirmando = aguardando && retorno === "approved";
  const pixGerado = aguardando && ["pending", "in_process", "authorized"].includes(p.pagamento_status ?? "");
  const perdeuPar = p.status === "cancelado" && p.pagamento_status === "par_indisponivel";
  const pelaEquipe = p.origem === "painel"; // venda fechada no WhatsApp/direct, paga pelo link do Mercado Pago
  const vence = p.expira_em ? new Date(p.expira_em).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Fortaleza" }) : null;
  const ajuda = linkWhatsApp(pelaEquipe ? `Olá! Queria falar sobre o meu pedido #${p.id}.` : `Olá! Fiz o pedido #${p.id} pelo site e queria falar sobre ele.`);

  return (
    <main className="page-center pedido-retorno">
      {(pago || aguardando) && !pelaEquipe && <LimparSacola />}
      <span className="empty-mark" aria-hidden="true">{pago ? "✓" : aguardando ? "…" : "!"}</span>
      <h1>{pago ? "Pagamento aprovado!" : confirmando ? "Confirmando o pagamento…" : aguardando ? "Aguardando o pagamento" : "O pagamento não foi concluído"}</h1>
      <p>
        {pago
          ? `Recebemos seu pedido #${p.id}. A equipe da Espaço 35 já foi avisada e vai separar seus pares para envio. Você recebe o acompanhamento pelo WhatsApp.`
          : confirmando
            ? `O Mercado Pago está confirmando o pagamento do pedido #${p.id}. Isso leva alguns segundos: atualize esta página.`
            : pelaEquipe && aguardando
            ? `Seu pedido #${p.id} está reservado com a equipe${vence ? ` até ${vence}` : ""}. Pague pelo link do Mercado Pago (Pix ou cartão): a confirmação chega em instantes, atualize esta página.`
            : pixGerado
            ? `Seu par está reservado para você. Pague o Pix (ou aguarde a análise do cartão) em até 30 minutos: a confirmação chega em instantes, atualize esta página.`
            : aguardando
            ? `Seu pedido #${p.id} vale por 30 minutos. O par só fica reservado para você quando o Pix é gerado ou o cartão enviado no Mercado Pago.`
            : perdeuPar
            ? `Outra cliente garantiu o par segundos antes de você. Como cada modelo tem um par só, o pedido #${p.id} foi cancelado e nada foi cobrado.`
            : pelaEquipe
            ? `O pedido #${p.id} não está mais aguardando pagamento. Fale com a equipe pelo WhatsApp para combinar.`
            : `Os pares do pedido #${p.id} voltaram para a loja. Você pode tentar de novo ou finalizar com a nossa equipe pelo WhatsApp.`}
      </p>
      <ul className="pedido-resumo">
        {(p.itens as ItemPedido[]).map((i) => <li key={i.slug}><span>{i.nome}</span><strong>{reais(i.preco)}</strong></li>)}
        <li><span>Frete · {p.entrega}</span><strong>{reais(p.frete)}</strong></li>
        <li className="total"><span>Total</span><strong>{reais(p.total)}</strong></li>
      </ul>
      <div className="hero-actions" style={{ justifyContent: "center" }}>
        {pago || aguardando || pelaEquipe ? <Link href="/produtos" className="button button-dark">Continuar na loja <span>↗</span></Link> : <Link href="/carrinho" className="button button-dark">Voltar à sacola <span>↗</span></Link>}
        <a href={ajuda} target="_blank" rel="noopener noreferrer" className="button button-outline">Falar no WhatsApp</a>
      </div>
      <p className="checkout-hint">Dúvidas? WhatsApp {WHATSAPP_EXIBIDO}.</p>
    </main>
  );
}
