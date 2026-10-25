# Ligar o painel de pedidos ao Supabase

O painel (`/painel`) guarda pedidos e a situação de cada par no Supabase. São uns 10 minutos, uma vez só.

## 1. Criar o projeto (grátis)

1. Entre em https://supabase.com e crie uma conta.
2. **New project**. Nome: `espaco35`. Região: **South America (São Paulo)**. Anote a senha do banco num lugar seguro.

## 2. Criar as tabelas

1. No projeto, abra **SQL Editor > New query**.
2. Cole todo o conteúdo de `supabase/schema.sql` e clique em **Run**.
   (Pode rodar de novo no futuro: não apaga nada.)

## 3. Criar o seu login do painel

1. **Authentication > Users > Add user > Create new user**.
2. Seu e-mail e uma senha forte. Marque **Auto Confirm User**.
3. Em **Authentication > Sign In / Providers**, desligue **Allow new users to sign up**.
   Assim ninguém cria conta sozinho: só quem você adicionar aqui entra no painel.

## 4. Ligar o site ao projeto

Em **Project Settings > API** (ou **Data API**) copie:

- **Project URL**
- **anon / publishable key** (a chave pública; NÃO use a `service_role`)

No computador: crie o arquivo `.env.local` na pasta do projeto (copie de `.env.example`) e cole os dois valores.

Na Vercel: **Project espaco35-loja > Settings > Environment Variables**, adicione as mesmas duas variáveis
(`NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`) para Production e Preview, e faça um novo deploy.

## Como funciona

- **Nome, foto e preço** de cada par continuam em `src/data/products.ts`. O banco guarda só a situação e os pedidos.
- **Novo pedido** "aguardando pagamento" reserva os pares: somem do site na hora.
- **Pago / enviado / entregue** marca como vendido. **Cancelar** devolve os pares ao estoque.
- **Reserva manual** (tela Estoque) segura o par por algumas horas; vencido o prazo, ele volta sozinho ao site.
- Dois vendedores nunca conseguem vender o mesmo par: o banco trava o par antes de gravar o pedido.
- Sem o Supabase ligado, o site funciona igual (usa só o `products.ts`) e o painel mostra este passo a passo.

## Vender pelo site (Pix, cartão e frete)

Depois do painel funcionando, siga `ATIVAR-PAGAMENTO.md` na raiz do projeto.
