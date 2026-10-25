import CheckoutCliente from "@/components/checkout/CheckoutCliente";
import { FRETE_FORTALEZA } from "@/lib/frete";
import { pagamentoOnlineAtivo } from "@/lib/mercadopago";

// O pagamento online só aparece quando o Mercado Pago e o banco estão configurados na Vercel.
// Sem isso, a finalização continua 100% pelo WhatsApp, como antes.
export default function CheckoutPage() {
  return <CheckoutCliente pagamentoOnline={pagamentoOnlineAtivo()} freteFortaleza={FRETE_FORTALEZA} />;
}
