export type Category = "tenis" | "sapatos" | "botas" | "sandalias";

export type Product = {
  slug: string;
  name: string;
  brand: string;
  category: Category;
  price: number | null; // null = "Sob consulta"
  compareAtPrice?: number | null; // preço "de" (riscado)
  description: string;
  sizes: number[];
  colors: string[];
  image: string;
  featured?: boolean;
};

export const categories: { key: Category; label: string }[] = [
  { key: "tenis", label: "Tênis" },
  { key: "sapatos", label: "Sapatos" },
  { key: "botas", label: "Botas" },
  { key: "sandalias", label: "Sandálias" },
];

// Espaço 35 — todos os pares são únicos, novos, originais e exclusivamente nº 35.
const SIZE = [35];

export const products: Product[] = [
  {
    slug: "slingback-prata-biqueira-dourada",
    name: "Slingback Prata Biqueira Dourada",
    brand: "Mississipi",
    category: "sapatos",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sapatilha slingback prata com biqueira dourada. Elegante e versátil.",
    sizes: SIZE,
    colors: ["Prata"],
    image: "/imagens/espaco35-01.jpg",
    featured: true,
  },
  {
    slug: "rasteira-tiras-mostarda",
    name: "Rasteira Tiras Mostarda",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Rasteira de tiras finas com aplique dourado. Leve e charmosa.",
    sizes: SIZE,
    colors: ["Mostarda"],
    image: "/imagens/espaco35-02.jpg",
  },
  {
    slug: "rasteira-gladiadora-caramelo",
    name: "Rasteira Gladiadora Caramelo",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description: "Rasteira estilo gladiadora caramelo com detalhe em strass.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-03.jpg",
  },
  {
    slug: "tenis-casual-caramelo",
    name: "Tênis Casual Caramelo",
    brand: "Mississipi",
    category: "tenis",
    price: 69.9,
    compareAtPrice: 100,
    description: "Tênis casual caramelo com listra preta. Conforto pro dia a dia.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-04.jpg",
  },
  {
    slug: "sandalia-salto-baixo-caramelo",
    name: "Sandália Salto Baixo Caramelo",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália de salto bloco baixo caramelo com tira metalizada.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-05.jpg",
  },
  {
    slug: "rasteira-dourada-trancada",
    name: "Rasteira Dourada Trançada",
    brand: "Campesí",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Rasteira slide dourada com tiras trançadas. Conforto inteligente.",
    sizes: SIZE,
    colors: ["Dourado"],
    image: "/imagens/espaco35-06.jpg",
  },
  {
    slug: "mule-off-white",
    name: "Mule Off-White",
    brand: "Mississipi",
    category: "sapatos",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Mule fechado off-white com recorte em 'H'. Sofisticada e clean.",
    sizes: SIZE,
    colors: ["Off-White"],
    image: "/imagens/espaco35-07.jpg",
    featured: true,
  },
  {
    slug: "flatform-caramelo-tachas",
    name: "Flatform Caramelo Tachas",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália flatform caramelo de duas tiras com tachas douradas.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-08.jpg",
  },
  {
    slug: "sandalia-salto-taca-caramelo",
    name: "Sandália Salto Taça Caramelo",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália de salto taça caramelo com tiras finas. Delicada e moderna.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-09.jpg",
  },
  {
    slug: "sandalia-salto-bloco-caramelo",
    name: "Sandália Salto Bloco Caramelo",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description: "Sandália de salto bloco caramelo com strass trançado.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-10.jpg",
  },
  {
    slug: "sandalia-salto-bloco-branca",
    name: "Sandália Salto Bloco Branca",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália de salto bloco branca com trança e strass. Perfeita pra eventos.",
    sizes: SIZE,
    colors: ["Branco"],
    image: "/imagens/espaco35-11.jpg",
  },
  {
    slug: "mocassim-tratorado-caramelo",
    name: "Mocassim Tratorado Caramelo",
    brand: "Mississipi",
    category: "sapatos",
    price: 69.9,
    compareAtPrice: 100,
    description: "Mocassim caramelo de solado tratorado. Estilo e atitude.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-12.jpg",
  },
  {
    slug: "tamanco-verde-fivela",
    name: "Tamanco Verde Fivela",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Tamanco slide verde claro com fivela redonda. Tendência da estação.",
    sizes: SIZE,
    colors: ["Verde"],
    image: "/imagens/espaco35-13.jpg",
  },
  {
    slug: "sandalia-salto-fino-dourada",
    name: "Sandália Salto Fino Dourada",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália de salto fino dourada. Brilho certo pra ocasiões especiais.",
    sizes: SIZE,
    colors: ["Dourado"],
    image: "/imagens/espaco35-14.jpg",
  },
  {
    slug: "sandalia-salto-taca-strass",
    name: "Sandália Salto Taça Strass",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália de salto taça caramelo com tiras de strass. Glamour discreto.",
    sizes: SIZE,
    colors: ["Caramelo"],
    image: "/imagens/espaco35-15.jpg",
  },
  {
    slug: "sandalia-salto-bloco-nude-medalhao",
    name: "Sandália Salto Bloco Nude Medalhão",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália nude de salto bloco com medalhão artesanal e detalhe dourado. Elegância delicada.",
    sizes: SIZE,
    colors: ["Nude"],
    image: "/imagens/espaco35-16.jpg",
    featured: true,
  },
  {
    slug: "tenis-rose-detalhe-dourado",
    name: "Tênis Rosê Detalhe Dourado",
    brand: "Mississipi",
    category: "tenis",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Tênis rosê com mesh respirável, cadarço bege e ilhós dourado. Leveza pro dia a dia.",
    sizes: SIZE,
    colors: ["Rosê"],
    image: "/imagens/espaco35-17.jpg",
    featured: true,
  },
  {
    slug: "tenis-branco-off-white",
    name: "Tênis Branco Off-White",
    brand: "Mississipi",
    category: "tenis",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Tênis branco com recortes off-white e friso dourado. Clássico que combina com tudo.",
    sizes: SIZE,
    colors: ["Branco"],
    image: "/imagens/espaco35-18.jpg",
  },
  {
    slug: "papete-anabela-bege-argola-dourada",
    name: "Papete Anabela Bege Argola Dourada",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Papete anabela bege com tiras em nó e argola dourada. Conforto com brilho na medida.",
    sizes: SIZE,
    colors: ["Bege"],
    image: "/imagens/espaco35-19.jpg",
  },
  {
    slug: "papete-dourada-tiras-argola",
    name: "Papete Dourada Tiras com Argola",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Papete flatform com tiras finas douradas e argola metálica. Iluminada e confortável.",
    sizes: SIZE,
    colors: ["Dourado"],
    image: "/imagens/espaco35-20.jpg",
    featured: true,
  },
  {
    slug: "tenis-branco-matelasse",
    name: "Tênis Branco Matelassê",
    brand: "Mississipi",
    category: "tenis",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Tênis branco matelassê com detalhes bege e coração metálico. Sofisticação esportiva.",
    sizes: SIZE,
    colors: ["Branco"],
    image: "/imagens/espaco35-21.jpg",
  },
  {
    slug: "rasteira-cafe-discos-dourados",
    name: "Rasteira Café Discos Dourados",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Rasteira café com discos em tons terrosos e dourados. Estilo boho elegante.",
    sizes: SIZE,
    colors: ["Marrom"],
    image: "/imagens/espaco35-22.jpg",
  },
  {
    slug: "sandalia-baixa-tranca-dourada-strass",
    name: "Sandália Baixa Trança Dourada Strass",
    brand: "Mississipi",
    category: "sandalias",
    price: 69.9,
    compareAtPrice: 100,
    description:
      "Sandália de salto baixo com tiras trançadas douradas e strass. Brilho discreto.",
    sizes: SIZE,
    colors: ["Nude"],
    image: "/imagens/espaco35-23.jpg",
  },
];

export function getProduct(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getProductsByCategory(category?: Category): Product[] {
  if (!category) return products;
  return products.filter((p) => p.category === category);
}

export function getFeatured(): Product[] {
  return products.filter((p) => p.featured);
}

export const formatPrice = (value: number | null) =>
  value == null
    ? "Sob consulta"
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
