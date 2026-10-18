# Espaço 35 Calçados 👟

Loja online de calçados femininos, **só tamanho 35** (Mississipi, Pink Cats e Campesí) — Next.js 16 (App Router) + TypeScript + Tailwind CSS v4.

A venda é **fechada no WhatsApp**: o site monta o pedido e abre a conversa com a loja. **Nada é cobrado pelo site.**

## Rodar localmente

```bash
npm run dev     # desenvolvimento em http://localhost:3000
npm run build   # build de produção
npm start       # serve o build
npm run lint
```

## O que tem

- **Home** (`/`), **coleção** (`/produtos`, com filtro por categoria) e **página de cada par** (`/produtos/[slug]`: galeria, código E35, preço).
- **Carrinho** (`/carrinho`): cada modelo é um **par único**, então o carrinho guarda só *quais* pares a cliente escolheu. Nome, foto, preço e se o par ainda está à venda vêm sempre do catálogo — nada de preço velho guardado no celular.
- **Fechar pedido** (`/checkout`): monta a mensagem (pares, códigos, total) e abre o WhatsApp. O carrinho só é limpo quando a cliente confirma que enviou.
- **Trocas e devoluções** (`/trocas-e-devolucoes`): direito de arrependimento (7 dias, CDC art. 49) e como medir o pé.

## Onde mexer no dia a dia

| O quê | Onde |
|---|---|
| Adicionar ou editar um par | `src/data/products.ts` |
| **Vendeu um par** | no bloco do par, acrescente `soldOut: true,` — ele fica no site com o selo "Vendido", vai para o fim da lista, sai dos destaques e não pode mais ser comprado. (Ou apague o bloco do par.) |
| Número do WhatsApp, endereço do site, horário | `src/lib/site.ts` |
| Nome empresarial, CNPJ e endereço no rodapé | `VENDEDOR`, em `src/lib/site.ts` (vazio = não aparece) |
| Depoimentos de clientes **reais** | lista `depoimentos`, em `src/app/page.tsx` (vazia = a seção não aparece) |
| Fotos | `public/imagens/espaco35-NN.jpg` |

## Estrutura

```
src/
  app/                  # rotas (App Router)
    produtos/[slug]/    # página de cada par (SSG)
    carrinho/ checkout/ trocas-e-devolucoes/
  components/           # Header, Footer, ProductCard, AddToCart, WhatsAppFloat...
  context/CartContext   # carrinho (guarda só os slugs; localStorage)
  data/products.ts      # catálogo + funções de apoio
  lib/site.ts           # dados do negócio (WhatsApp, site, horário, vendedor)
```

## Próximos passos

- Preencher `VENDEDOR` (nome empresarial, CNPJ/CPF e endereço) quando a loja tiver CNPJ — o decreto do e-commerce pede isso em lugar de destaque.
- Domínio próprio: trocar `SITE_URL` em `src/lib/site.ts`.
- Depoimentos reais de clientes na home.
