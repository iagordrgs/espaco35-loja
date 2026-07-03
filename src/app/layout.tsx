import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/context/CartContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://espaco35-loja.vercel.app"),
  title: {
    default: "Espaço 35 | Calçados Femininos Tamanho 35 · Fortaleza",
    template: "%s · Espaço 35",
  },
  description:
    "Loja de calçados femininos só tamanho 35. Modelos novos e originais das marcas Mississipi, Pink Cats e Campesí, com caixa.",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Espaço 35",
    title: "Espaço 35 | Calçados Femininos Tamanho 35 · Fortaleza",
    description:
      "Sapato bonito no 35 a gente tem. Modelos novos e originais — Mississipi, Pink Cats e Campesí, com caixa.",
    images: [{ url: "/imagens/espaco35-16.jpg", width: 1600, height: 1200 }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${manrope.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <CartProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
          <WhatsAppFloat />
        </CartProvider>
      </body>
    </html>
  );
}
