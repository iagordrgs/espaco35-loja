import { CartProvider } from "@/context/CartContext";
import { EstoqueProvider } from "@/context/EstoqueContext";
import { FavoritesProvider } from "@/context/FavoritesContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import { getEstoque } from "@/lib/estoque";

export default async function LojaLayout({ children }: { children: React.ReactNode }) {
  // situação de cada par (vendido/reservado) vinda do painel; vai para o carrinho no celular da cliente
  const estoque = await getEstoque();

  return (
    <EstoqueProvider estoque={estoque}>
      <CartProvider>
        <FavoritesProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppFloat />
        </FavoritesProvider>
      </CartProvider>
    </EstoqueProvider>
  );
}
