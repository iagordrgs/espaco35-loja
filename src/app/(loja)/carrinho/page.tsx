import CarrinhoCliente from "@/components/carrinho/CarrinhoCliente";
import { pagamentoOnlineAtivo } from "@/lib/mercadopago";

// Com o pagamento online ligado, o botão leva a pagar no site; sem ele, segue para o WhatsApp como antes.
export default function CarrinhoPage() {
  return <CarrinhoCliente pagamentoOnline={pagamentoOnlineAtivo()} />;
}
