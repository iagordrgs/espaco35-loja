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
    <div className="mx-auto max-w-3xl px-4 py-10">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-brand">
          Início
        </Link>
        {" / "}
        <span className="text-foreground">Trocas e devoluções</span>
      </nav>

      <h1 className="text-3xl font-bold">Trocas e devoluções</h1>
      <p className="mt-3 text-lg text-foreground/80">
        Comprou um par e não serviu ou você não gostou? Sem problema: você tem 7
        dias para desistir da compra.
      </p>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Você tem 7 dias para desistir</h2>
        <p className="mt-3 text-foreground/80">
          Quem compra à distância pode desistir da compra em até 7 dias corridos,
          contados do recebimento do par, sem precisar explicar o motivo. É um
          direito garantido pelo art. 49 do Código de Defesa do Consumidor. Se
          você desistir, a gente devolve o valor que você pagou.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Como pedir a devolução</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/80">
          <li>
            Chame a gente no WhatsApp {WHATSAPP_EXIBIDO} dentro dos 7 dias — pode
            ser na mesma conversa em que você fez o pedido.
          </li>
          <li>Combinamos com você como devolver o par.</li>
          <li>Mande o par de volta como você recebeu: novo, sem uso e na caixa.</li>
          <li>
            Devolvemos o valor pago, pela mesma forma de pagamento que você usou.
          </li>
        </ol>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Par com defeito ou diferente do pedido</h2>
        <p className="mt-3 text-foreground/80">
          Se o par chegar com algum defeito ou for diferente do que você pediu,
          avise pelo WhatsApp assim que receber, com fotos. A gente resolve com
          você.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-bold">Como saber se o 35 é o seu número</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-6 text-foreground/80">
          <li>
            Apoie o pé descalço numa folha de papel, com o calcanhar encostado na
            parede.
          </li>
          <li>Marque no papel onde termina o dedão (o dedo mais comprido).</li>
          <li>Meça, da parede até a marca, o comprimento do seu pé.</li>
        </ol>
        <p className="mt-3 text-foreground/80">
          Um pé de cerca de 23 cm costuma calçar 35, mas é só uma referência:
          cada marca e cada modelo calça de um jeito. Ficou na dúvida? Mande a
          medida do seu pé no WhatsApp antes de comprar.
        </p>
      </section>

      <div className="mt-12 rounded-xl border border-[var(--line)] bg-nude p-6">
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
          className="mt-4 inline-block rounded-full bg-brand px-6 py-3 text-sm font-semibold text-background transition hover:bg-accent"
        >
          Falar no WhatsApp
        </a>
      </div>
    </div>
  );
}
