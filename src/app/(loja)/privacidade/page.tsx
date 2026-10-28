import type { Metadata } from "next";
import Link from "next/link";
import { HORARIO, WHATSAPP_EXIBIDO, linkWhatsApp } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacidade",
  description: "Quais dados a Espaço 35 pede para entregar o seu par, para que usa cada um e como você pode pedir para apagar.",
};

// Política curta, em linguagem simples (LGPD, Lei 13.709/2018). Sem CNPJ ainda: identifica a loja pelo nome e pelo WhatsApp.
export default function PrivacidadePage() {
  return (
    <main className="editorial-shell">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/" className="hover:text-brand">Início</Link>
        {" / "}
        <span className="text-foreground">Privacidade</span>
      </nav>

      <p className="page-kicker">Seus dados</p>
      <h1 className="page-title">Privacidade.</h1>
      <p className="page-intro">
        Pedimos só o que precisamos para entregar o seu par. Nada é vendido nem usado para propaganda de terceiros.
      </p>

      <div className="editorial-copy">
        <section>
          <h2>O que pedimos e para quê</h2>
          <ul>
            <li><strong>Nome, e-mail e WhatsApp:</strong> para confirmar o pedido e avisar sobre pagamento, envio e rastreio.</li>
            <li><strong>CEP e endereço:</strong> para calcular o frete e entregar o par.</li>
            <li><strong>Pedido:</strong> quais pares, valor e situação, para o atendimento e para trocas e devoluções.</li>
          </ul>
          <p>Não pedimos CPF, senha nem dados do cartão. O pagamento é feito direto no Mercado Pago, que cuida desses dados.</p>
        </section>

        <section>
          <h2>Com quem os dados passam</h2>
          <ul>
            <li><strong>Mercado Pago:</strong> processa o pagamento (nome e e-mail).</li>
            <li><strong>Melhor Envio, Correios ou motoboy:</strong> recebem nome, endereço e telefone para entregar.</li>
            <li><strong>Supabase e Vercel:</strong> hospedam o site e guardam os pedidos, com acesso restrito à equipe da loja.</li>
          </ul>
        </section>

        <section>
          <h2>O que fica no seu aparelho</h2>
          <p>
            A sacola, os favoritos e a sua reserva ficam salvos só no seu navegador, para você não perder a escolha ao
            voltar. Não usamos cookies de publicidade.
          </p>
        </section>

        <section>
          <h2>Por quanto tempo guardamos</h2>
          <p>
            Pelo prazo de troca e devolução e pelo tempo que a lei exige para registros de venda. Pedido que não foi
            pago é cancelado sozinho e fica só como registro.
          </p>
        </section>

        <section>
          <h2>Seus direitos</h2>
          <p>
            Você pode pedir para ver, corrigir ou apagar os seus dados, e saber com quem foram compartilhados. É só
            chamar no WhatsApp {WHATSAPP_EXIBIDO}. Respondemos em até 15 dias.
          </p>
        </section>
      </div>

      <div className="editorial-callout">
        <p className="font-semibold">Alguma dúvida sobre os seus dados?</p>
        <p className="mt-1 text-sm text-muted">Chama a gente no WhatsApp {WHATSAPP_EXIBIDO} · {HORARIO}</p>
        <a href={linkWhatsApp("Oi! Tenho uma dúvida sobre os meus dados na Espaço 35.")} target="_blank" rel="noopener noreferrer" className="button button-red">
          Falar no WhatsApp
        </a>
      </div>
    </main>
  );
}
