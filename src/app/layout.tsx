import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";
import { SITE_URL } from "@/lib/site";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

// Celular: largura do aparelho e cor da barra do Safari/Chrome combinando com o topo do site.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#101010",
};

// Segurança para celulares antigos: se o JavaScript do site não carregar em 3s, mostra tudo sem animação
// (títulos e cards começam invisíveis para a animação de entrada). ES5 de propósito: roda em qualquer iPhone.
const SCRIPT_SEGURANCA =
  "setTimeout(function(){var d=document.documentElement;if(!d.getAttribute('data-hidratado')){d.className+=' sem-animacao'}},3000)";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_SEGURANCA }} />
        {children}
      </body>
    </html>
  );
}
