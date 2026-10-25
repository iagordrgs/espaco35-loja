# Ativar a venda pelo site (Pix, cartão e frete)

O código já está pronto. Enquanto as chaves abaixo não forem cadastradas, o site funciona como hoje:
a finalização é só pelo WhatsApp. Quando tudo estiver cadastrado, aparece na finalização o bloco
**"Pagar agora · Pix ou cartão"**, e a opção do WhatsApp continua logo abaixo.

> As chaves são senhas. Cadastre direto na Vercel e no arquivo `.env.local`. Nunca mande por chat, e-mail ou print.

## 1. Banco de dados (Supabase): obrigatório

Siga `supabase/LEIA-ME.md` (criar projeto, rodar `supabase/schema.sql`, criar seu login).
Se você já rodou o `schema.sql` antes, **rode de novo**: ele acrescenta o que os pedidos do site precisam, sem apagar nada.

Em **Project Settings > API** copie também a chave **service_role** → `SUPABASE_SERVICE_ROLE_KEY`.
Ela é secreta: só a Vercel pode ter.

## 2. Mercado Pago (Pix e cartão)

1. Entre em https://www.mercadopago.com.br/developers com a conta da loja (pode ser no seu CPF).
2. **Suas integrações > Criar aplicação**: nome "Espaço 35 loja", produto **Checkout Pro**.
3. **Credenciais de produção** → copie o **Access Token** (`APP_USR-...`) → `MERCADOPAGO_ACCESS_TOKEN`.
4. **Webhooks > Configurar notificações**:
   - URL de produção: `https://espaco35.vercel.app/api/mercadopago/webhook`
   - Evento: **Pagamentos**
   - Salve e copie a **assinatura secreta** → `MERCADOPAGO_WEBHOOK_SECRET`.
5. Em **Seu negócio > Custos**, escolha o prazo de recebimento (na hora ou em 14/30 dias, com taxas diferentes)
   e se o parcelamento terá juros para a cliente. O site oferece até 6x; quem paga os juros segue a configuração da sua conta.

Para testar antes de vender de verdade: use as **credenciais de teste** e os cartões de teste do Mercado Pago,
faça uma compra, confira o pedido no painel e só então troque pelas credenciais de produção.

## 3. Melhor Envio (frete para fora de Fortaleza)

1. Crie a conta em https://melhorenvio.com.br.
2. **Integrações > Permissões de acesso > Gerar token** (marque a permissão de cálculo de frete) → `MELHORENVIO_TOKEN`.
3. `LOJA_CEP_ORIGEM` = CEP de onde os pares saem em Fortaleza (só números).

Fortaleza não usa o Melhor Envio: é sempre R$ 10,00 (motoboy). Para mudar, edite `FRETE_FORTALEZA` em `src/lib/frete.ts`.
As medidas da caixa (33 × 22 × 13 cm, 0,9 kg) ficam no mesmo arquivo; ajuste se as caixas forem maiores.

## 4. Aviso por e-mail para a equipe (opcional, recomendado)

1. Crie a conta em https://resend.com e gere uma **API Key** → `RESEND_API_KEY`.
2. `EMAIL_EQUIPE` = quem recebe os avisos (pode ter mais de um, separados por vírgula).
3. Sem domínio próprio, o Resend só envia para o e-mail da própria conta. Com domínio verificado, cadastre também
   `EMAIL_REMETENTE` (ex.: `Espaço 35 <pedidos@espaco35.com.br>`).

Mesmo sem e-mail, todo pedido pago aparece no painel com a etiqueta **Site**, o endereço e o status do pagamento.
O aplicativo do Mercado Pago também avisa no celular a cada pagamento recebido.

## 5. Cadastrar na Vercel e publicar

Vercel > projeto **espaco35-loja** > **Settings > Environment Variables**: cadastre todas as variáveis do `.env.example`
(ambiente **Production**). Depois, em **Deployments**, faça **Redeploy** do último deploy para elas valerem.

## Como funciona depois de ativo

1. A cliente informa o CEP: o endereço é preenchido e o frete aparece (Fortaleza R$ 10; Brasil pelo Melhor Envio).
2. Ao clicar em pagar, os pares ficam **reservados por 30 minutos** e somem do site; o Pix vence junto.
3. Pagamento aprovado: o pedido vira **Pago** no painel, os pares ficam **Vendidos** e a equipe recebe o e-mail
   com itens e endereço para enviar.
4. Pagamento recusado ou não feito em 30 minutos: o pedido é cancelado e os pares voltam ao site sozinhos.
5. Caso raro: se um Pix for pago depois da reserva vencer e o par já tiver ido para outra cliente, o pedido fica
   marcado no painel com **ATENÇÃO** para reembolso ou troca, e o e-mail chega com "CONFERIR" no assunto.
