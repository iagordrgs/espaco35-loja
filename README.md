# Espaço 35 Calçados 👟

E-commerce de calçados (MVP storefront) — Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

## Rodar localmente

```bash
npm run dev     # ambiente de desenvolvimento em http://localhost:3000
npm run build   # build de produção
npm start       # servir o build
```

## O que já tem (MVP)

- **Home** (`/`) — hero, categorias e produtos em destaque.
- **Catálogo** (`/produtos`) — listagem com filtro por categoria (`?categoria=tenis|sapatos|botas|sandalias`).
- **Página de produto** (`/produtos/[slug]`) — galeria, seleção de cor/tamanho/quantidade, relacionados (SSG).
- **Carrinho** (`/carrinho`) — persistido em `localStorage`, edição de quantidade e resumo.
- **Checkout** (`/checkout`) — formulário de entrega + **stub de pagamento** (nenhuma cobrança real).

## Estrutura

```
src/
  app/                 # rotas (App Router)
    produtos/[slug]/   # página de produto (SSG)
    carrinho/ checkout/
  components/          # Header, Footer, ProductCard, AddToCart
  context/CartContext  # estado do carrinho (reducer + localStorage)
  data/products.ts     # catálogo mock + helpers
```

## Próximos passos sugeridos

- Trocar imagens placeholder (`picsum.photos`) por fotos reais dos produtos.
- Integrar pagamento real no checkout (Stripe, Mercado Pago, etc.).
- Backend/CMS para o catálogo (hoje é mock em `src/data/products.ts`).
- Autenticação, pedidos e painel admin.

> Imagens via `picsum.photos` são placeholders determinísticos (configurado em `next.config.ts`).
