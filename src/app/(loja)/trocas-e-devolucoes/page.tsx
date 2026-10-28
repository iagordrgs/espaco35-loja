import type { Metadata } from "next";
import Link from "next/link";
import { HORARIO, WHATSAPP_EXIBIDO, linkWhatsApp } from "@/lib/site";

export const metadata: Metadata = {
  title: "Trocas e devoluções",
  description:
    "Você tem 7 dias para desistir da compra. Veja como pedir a devolução do seu par e como saber se o 35 é o seu número.",
};

export default function TrocasEDevolucoesPage() {
  return (
    <main className="editorial-shell">
      <nav className="breadcrumb" aria-label="Você está em">
        <Link href="/" className="hover:text-brand">
          Início
        </Link>
        {" / "}
        <span className="text-foreground">Trocas e devoluções</span>
      </nav>

      <p className="page-kicker">Compra com tranquilidade</p>
      <h1 className="page-title">Trocas e devoluções.</h1>
      <p className="page-intro">
        Comprou um par e não serviu ou você não gostou? Sem problema: você tem 7
        dias para desistir da compra.
      </p>

      <div className="editorial-copy">
      <section>
        <h2>Você tem 7 dias para desistir</h2>
        <p>
          Quem compra à distância pode desistir da compra em até 7 dias corridos,
          contados do recebimento do par, sem precisar explicar o motivo. É um
          direito garantido pelo art. 49 do Código de Defesa do Consumidor. Se
          você desistir, a gente devolve o valor que você pagou.
        </p>
      </section>

      <section>
        <h2>Como pedir a devolução</h2>
        <ol>
          <li>
            Chame a gente no WhatsApp {WHATSAPP_EXIBIDO} dentro dos 7 dias — pode
            ser na mesma conversa em que você fez o pedido.
          </li>
          <li>
            O frete da devolução é por nossa conta: mandamos uma etiqueta para
            você postar nos Correios ou, em Fortaleza, buscamos o par com você.
          </li>
          <li>Mande o par de volta como você recebeu: novo, sem uso e na caixa.</li>
          <li>
            Devolvemos o valor pago, pela mesma forma de pagamento que você usou.
          </li>
        </ol>
      </section>

      <section>
        <h2>Quando o pedido é enviado</h2>
        <p>
          Postamos em até 2 dias úteis depois da confirmação do pagamento e
          mandamos o código de rastreio pelo WhatsApp. Em Fortaleza, a entrega
          é por motoboy ou você retira com a equipe, combinando dia e hora.
        </p>
      </section>

      <section>
        <h2>Par com defeito ou diferente do pedido</h2>
        <p>
          Se o par chegar com algum defeito ou for diferente do que você pediu,
          avise pelo WhatsApp assim que receber, com fotos. A gente resolve com
          você.
        </p>
      </section>

      <section>
        <h2>Como saber se o 35 é o seu número</h2>
        <ol>
          <li>
            Apoie o pé descalço numa folha de papel, com o calcanhar encostado na
            parede.
          </li>
          <li>Marque no papel onde termina o dedão (o dedo mais comprido).</li>
          <li>Meça, da parede até a marca, o comprimento do seu pé.</li>
        </ol>
        <p>
          Um pé de cerca de 23 cm costuma calçar 35, mas é só uma referência:
          cada marca e cada modelo calça de um jeito. Ficou na dúvida? Mande a
          medida do seu pé no WhatsApp antes de comprar.
        </p>
      </section>

      </div>
      <div className="editorial-callout">
        <p className="font-semibold">Ficou com alguma dúvida?</p>
        <p className="mt-1 text-sm text-muted">
          Chama a gente no WhatsApp {WHATSAPP_EXIBIDO} · {HORARIO}
        </p>
        <a
          href={linkWhatsApp(
            "Oi! Tenho uma dúvida sobre trocas e devoluções da Espaço 35."
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="button button-red"
        >
          Falar no WhatsApp
        </a>
      </div>
    </main>
  );
}
