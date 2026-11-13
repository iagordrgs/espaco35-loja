-- Espaço 35 · banco do painel de pedidos
-- Rodar uma vez no Supabase: Dashboard > SQL Editor > New query > colar tudo > Run.
-- Pode rodar de novo sem perder dados (cria só o que falta e atualiza as funções).
--
-- Ideia geral
--   * Nome, foto e preço de cada par continuam em src/data/products.ts.
--   * Aqui fica só a SITUAÇÃO de cada par (estoque) e os PEDIDOS.
--   * Par sem linha na tabela estoque = disponível.
--   * Cada modelo é um par único: as funções abaixo travam as linhas antes de mexer,
--     então dois pedidos nunca levam o mesmo par.

-- ───────────── tabelas ─────────────

create table if not exists public.estoque (
  slug           text primary key,
  status         text not null default 'disponivel'
                 check (status in ('disponivel', 'reservado', 'vendido')),
  reservado_ate  timestamptz,          -- reserva manual com prazo; vencida = disponível de novo
  pedido_id      bigint,               -- pedido que segurou ou vendeu o par
  atualizado_em  timestamptz not null default now()
);

create table if not exists public.pedidos (
  id               bigint generated always as identity primary key,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now(),
  status           text not null default 'novo'
                   check (status in ('novo', 'pago', 'enviado', 'entregue', 'cancelado')),
  cliente_nome     text not null,
  cliente_telefone text,
  cliente_cidade   text,
  itens            jsonb not null,     -- [{ slug, nome, codigo, categoria, preco }]
  subtotal         numeric(10,2) not null default 0,
  desconto         numeric(10,2) not null default 0,
  frete            numeric(10,2) not null default 0,
  total            numeric(10,2) not null default 0,
  pagamento        text,               -- pix, cartão, dinheiro...
  entrega          text,               -- correios, motoboy, retirada...
  vendedor         text,               -- quem atendeu (todos usam o mesmo WhatsApp)
  observacoes      text
);

-- Pedidos feitos e pagos pelo próprio site (Mercado Pago). Colunas novas: rodar o arquivo de novo cria só o que falta.
alter table public.pedidos add column if not exists origem text not null default 'painel';      -- 'painel' ou 'site'
alter table public.pedidos add column if not exists cliente_email text;
alter table public.pedidos add column if not exists endereco jsonb;                              -- {cep, rua, numero, complemento, bairro, cidade, uf}
alter table public.pedidos add column if not exists codigo_publico uuid not null default gen_random_uuid();
alter table public.pedidos add column if not exists expira_em timestamptz;                       -- fim da reserva enquanto espera o pagamento
alter table public.pedidos add column if not exists pagamento_id text;                           -- id do pagamento no Mercado Pago
alter table public.pedidos add column if not exists pagamento_status text;                       -- approved, pending, rejected...
alter table public.pedidos add column if not exists cliente_ip_hash text;                        -- hash do IP: limita reservas abertas por aparelho
alter table public.pedidos add column if not exists rastreio text;                               -- código de rastreio ou como foi entregue (Uber Flash, retirado)
alter table public.pedidos add column if not exists link_pagamento text;                         -- link do Mercado Pago gerado pelo painel para venda pelo WhatsApp/direct
alter table public.pedidos add column if not exists aviso_pendente text;                         -- e-mail para a equipe que ainda não saiu: pago, conferir ou estorno
-- pagamentos_vistos: pagamentos aprovados já tratados (pedido pago ou conflito avisado). Criada uma vez só; ao criar,
-- os pedidos de antes recebem só o pagamento aprovado que já foi tratado (nunca um Pix ainda pendente). Os conflitos
-- que o vencimento antigo marcou como 'expirado' são achados pela observação exata que o banco escreve.
do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema = 'public' and table_name = 'pedidos' and column_name = 'pagamentos_vistos') then
    alter table public.pedidos add column pagamentos_vistos text[] not null default '{}';
    -- conflito cuja situação o vencimento ou um cancelamento antigo trocou ('expirado', 'substituido', 'rejected'...)
    update public.pedidos set pagamentos_vistos = array[pagamento_id]
     where pagamento_id is not null
       and (pagamento_status in ('approved', 'valor_divergente')
            or (coalesce(pagamento_status, '') not in ('pending', 'in_process', 'authorized')
                and (observacoes like '%ATENÇÃO: pagamento de R$ % menor que o total%'
                     or observacoes like '%ATENÇÃO: pagamento aprovado num pedido que a equipe cancelou%'
                     or observacoes like '%ATENÇÃO: pago depois que a reserva venceu%')));
  end if;
end $$;

-- Equipe: só quem está nesta lista mexe no painel. Ter conta no Supabase não basta.
-- Para incluir alguém: insert into public.equipe (user_id, email) select id, email from auth.users where email = 'pessoa@exemplo.com';
create table if not exists public.equipe (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  email     text,
  criado_em timestamptz not null default now()
);
create unique index if not exists pedidos_codigo_publico_idx on public.pedidos (codigo_publico);

create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);
create index if not exists pedidos_status_idx on public.pedidos (status);

-- ───────────── acesso (RLS) ─────────────
-- Site público: só LÊ a situação dos pares (sem dado de cliente).
-- Painel: quem fez login (usuários criados por você no Supabase) lê e escreve tudo.

-- Permissões explícitas (funciona mesmo com "Expor automaticamente novas tabelas" desligado).
-- Quem vê o quê continua decidido pelas regras (policies) logo abaixo.
grant usage on schema public to anon, authenticated, service_role;
revoke select on public.estoque from anon;
grant select (slug, status, reservado_ate) on public.estoque to anon;
grant select on public.estoque to authenticated;
grant select on public.equipe to authenticated;
grant all on public.equipe to service_role;
grant insert, update, delete on public.estoque to authenticated;
grant select, insert, update, delete on public.pedidos to authenticated;
grant all on public.estoque, public.pedidos to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter table public.estoque enable row level security;
alter table public.pedidos enable row level security;
alter table public.equipe enable row level security;

-- Quem fez login está na equipe? (security definer: consulta a lista sem depender das regras dela)
create or replace function public.eh_equipe()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;
grant execute on function public.eh_equipe() to anon, authenticated, service_role;

drop policy if exists "equipe ve a si mesma" on public.equipe;
create policy "equipe ve a si mesma" on public.equipe
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "estoque leitura publica" on public.estoque;
create policy "estoque leitura publica" on public.estoque
  for select to anon, authenticated using (true);

drop policy if exists "estoque escrita painel" on public.estoque;
create policy "estoque escrita painel" on public.estoque
  for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

drop policy if exists "pedidos painel" on public.pedidos;
create policy "pedidos painel" on public.pedidos
  for all to authenticated using (public.eh_equipe()) with check (public.eh_equipe());

-- ───────────── funções ─────────────

-- Par livre para vender: sem linha, disponível, ou reserva com prazo vencido
-- (reserva manual do painel ou pedido do site que não foi pago a tempo; pedido do painel não tem prazo).
create or replace function public.par_livre(e public.estoque)
returns boolean language sql stable as $$
  select e.slug is null
      or e.status = 'disponivel'
      or (e.status = 'reservado' and e.reservado_ate is not null and e.reservado_ate < now());
$$;

-- Pedidos com reserva vencida sem pagamento (site: 30 min; painel/WhatsApp: 24 h): cancela e devolve os pares.
create or replace function public.cancelar_expirados()
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  qtd integer;
begin
  with vencidos as (
    -- pagamento aprovado num pedido em conflito continua registrado (a equipe confere e reembolsa): sem isso,
    -- a volta da cliente e a conferência diária achariam que o pagamento é novo e avisariam o conflito de novo
    update pedidos set status = 'cancelado', atualizado_em = now(),
           pagamento_status = case when pagamento_status in ('approved', 'valor_divergente', 'refunded', 'charged_back', 'in_mediation', 'partially_refunded') then pagamento_status else 'expirado' end
     where status = 'novo' and expira_em is not null and expira_em < now()
    returning id
  )
  select count(*) into qtd from vencidos;
  update estoque e set status = 'disponivel', pedido_id = null, reservado_ate = null, atualizado_em = now()
   from pedidos p
   where e.pedido_id = p.id and p.status = 'cancelado' and e.status = 'reservado';
  return qtd;
end;
$$;

-- Pedidos abertos do site que um pedido novo da mesma cliente substitui:
--   * o pedido cujo código público o navegador mandou em 'substituir' (quem tem o código abriu o pedido), ou
--   * pedido da mesma cliente (mesmo e-mail ou WhatsApp) que ainda NÃO gerou Pix nem mandou cartão.
-- Pedido com Pix gerado só é substituído pelo código: quem só sabe o e-mail ou o WhatsApp de outra cliente
-- não derruba o pedido dela. Com 'antes_de', só pedidos mais antigos que ele (dois cliques juntos: o mais novo vale).
create or replace function public.pedidos_substituiveis(email text, telefone text, codigo text, antes_de bigint)
returns bigint[]
language sql
stable
security invoker
set search_path = public
as $$
  select coalesce(array_agg(p.id), '{}')
    from pedidos p
   where p.origem = 'site' and p.status = 'novo'
     and (antes_de is null or p.id < antes_de)
     and (
       (codigo is not null and p.codigo_publico::text = lower(codigo))
       or (p.pagamento_status is null and (
             (email is not null and lower(p.cliente_email) = lower(email))
             or (length(regexp_replace(coalesce(telefone, ''), '\D', '', 'g')) >= 10
                 and regexp_replace(coalesce(p.cliente_telefone, ''), '\D', '', 'g') = regexp_replace(telefone, '\D', '', 'g'))))
     );
$$;

-- Depois que o link do Mercado Pago do pedido novo saiu: cancela os pedidos que ele substitui ('substituido').
-- Se o pedido novo falhar antes disso (CEP, frete, par esgotado, Mercado Pago fora), os anteriores ficam como estavam.
create or replace function public.substituir_pedidos_site(novo bigint, codigo text default null)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  ped pedidos;
  alvo bigint;
  qtd integer := 0;
begin
  select * into ped from pedidos where id = novo;
  if ped.id is null or ped.origem <> 'site' or ped.status <> 'novo' then return 0; end if;
  foreach alvo in array pedidos_substituiveis(ped.cliente_email, ped.cliente_telefone, codigo, novo) loop
    -- os pares que continuam na sacola não voltam à venda no meio da troca: a reserva passa para o pedido novo
    update estoque set pedido_id = novo, reservado_ate = ped.expira_em, atualizado_em = now()
     where pedido_id = alvo and status = 'reservado'
       and slug in (select item->>'slug' from jsonb_array_elements(ped.itens) item);
    perform cancelar_pedido_site(alvo, 'substituido');
    qtd := qtd + 1;
  end loop;
  return qtd;
end;
$$;

-- Cria o pedido e segura os pares. Status 'novo' reserva; 'pago'/'enviado'/'entregue' já vende.
-- Falha (e não grava nada) se algum par já estiver reservado ou vendido.
-- Com sem_reserva = true (pedido do site) só confere se os pares estão livres e NÃO reserva: a reserva
-- acontece em reservar_pedido, quando o Mercado Pago avisa que o Pix foi gerado ou o cartão enviado.
-- Pedido do site (origem 'site'): uma criação por vez (trava), para dois cliques juntos não passarem pelas regras.
-- Os pedidos que o novo vai substituir (pedidos_substituiveis) não contam no limite por conexão e os pares deles
-- contam como livres; quem os cancela é substituir_pedidos_site, só depois que o link do Mercado Pago saiu.
create or replace function public.criar_pedido(dados jsonb)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  novo_id    bigint;
  st         text := coalesce(dados->>'status', 'novo');
  sem_reserva boolean := coalesce((dados->>'sem_reserva')::boolean, false);
  prazo      timestamptz := case when (dados->>'reservar_minutos') is not null
                                 then now() + make_interval(mins => (dados->>'reservar_minutos')::int) end;
  slugs      text[];
  ocupados   text[];
  substitui  bigint[] := '{}';
begin
  select array_agg(item->>'slug') into slugs from jsonb_array_elements(dados->'itens') item;
  if slugs is null or array_length(slugs, 1) = 0 then
    raise exception 'Pedido sem pares.';
  end if;
  -- pedido do site: a trava vem antes de tudo (inclusive da limpeza dos vencidos), para duas criações não se travarem
  if coalesce(dados->>'origem', 'painel') = 'site' then
    perform pg_advisory_xact_lock(353500); -- um pedido do site por vez
  end if;
  perform cancelar_expirados();

  if coalesce(dados->>'origem', 'painel') = 'site' then
    substitui := pedidos_substituiveis(dados->>'cliente_email', dados->>'cliente_telefone', dados->>'substituir', null);
    -- todo pedido aberto desta conexão conta, inclusive os da mesma cliente com Pix gerado; só não contam os que este
    -- pedido vai substituir
    if (select count(*) from pedidos p
         where p.origem = 'site' and p.status = 'novo' and p.expira_em > now()
           and p.cliente_ip_hash = dados->>'cliente_ip_hash'
           and not (p.id = any(substitui))) >= coalesce((dados->>'max_por_conexao')::int, 2) then
      raise exception 'Limite de pedidos abertos por conexão.';
    end if;
  end if;

  -- garante uma linha por par e trava todas antes de conferir
  insert into estoque (slug) select unnest(slugs) on conflict (slug) do nothing;
  perform 1 from estoque where slug = any(slugs) for update;

  select array_agg(e.slug) into ocupados
    from estoque e where e.slug = any(slugs) and not par_livre(e)
     and not (e.pedido_id is not null and e.pedido_id = any(substitui));
  if ocupados is not null then
    -- o par está preso num pedido aberto da própria cliente (Pix gerado em outro aparelho, sem o código): avisa isso,
    -- e não "outra cliente reservou"
    if coalesce(dados->>'origem', 'painel') = 'site' and not exists (
         select 1 from estoque e
          where e.slug = any(ocupados)
            and not exists (select 1 from pedidos p
                             where p.id = e.pedido_id and p.origem = 'site' and p.status = 'novo'
                               and (lower(p.cliente_email) = lower(dados->>'cliente_email')
                                    or regexp_replace(coalesce(p.cliente_telefone, ''), '\D', '', 'g')
                                       = regexp_replace(coalesce(dados->>'cliente_telefone', ''), '\D', '', 'g')))) then
      raise exception 'Par no seu pedido: %', array_to_string(ocupados, ', ');
    end if;
    raise exception 'Par indisponível: %', array_to_string(ocupados, ', ');
  end if;

  insert into pedidos (status, cliente_nome, cliente_telefone, cliente_cidade, itens,
                       subtotal, desconto, frete, total, pagamento, entrega, vendedor, observacoes,
                       origem, cliente_email, endereco, expira_em, cliente_ip_hash)
  values (st, dados->>'cliente_nome', dados->>'cliente_telefone', dados->>'cliente_cidade', dados->'itens',
          coalesce((dados->>'subtotal')::numeric, 0), coalesce((dados->>'desconto')::numeric, 0),
          coalesce((dados->>'frete')::numeric, 0), coalesce((dados->>'total')::numeric, 0),
          dados->>'pagamento', dados->>'entrega', dados->>'vendedor', dados->>'observacoes',
          coalesce(dados->>'origem', 'painel'), dados->>'cliente_email', dados->'endereco',
          case when st = 'novo' then prazo end, dados->>'cliente_ip_hash')
  returning id into novo_id;

  if not (sem_reserva and st = 'novo') then
    update estoque
       set status = case when st = 'novo' then 'reservado' else 'vendido' end,
           pedido_id = novo_id, reservado_ate = case when st = 'novo' then prazo end, atualizado_em = now()
     where slug = any(slugs);
  end if;

  return novo_id;
end;
$$;

-- Pedido do site: reserva os pares quando o Mercado Pago avisa que o Pix foi gerado ou o cartão enviado.
-- Devolve 'ok', 'ignorado' (pedido não está mais aguardando) ou 'indisponivel' (outra cliente levou o par antes).
create or replace function public.reservar_pedido(pedido bigint)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  ped   pedidos;
  slugs text[];
begin
  select * into ped from pedidos where id = pedido for update;
  if ped.id is null or ped.status <> 'novo' then return 'ignorado'; end if;

  select array_agg(item->>'slug') into slugs from jsonb_array_elements(ped.itens) item;
  insert into estoque (slug) select unnest(slugs) on conflict (slug) do nothing;
  perform 1 from estoque where slug = any(slugs) for update;
  if exists (select 1 from estoque e where e.slug = any(slugs)
              and e.pedido_id is distinct from pedido and not par_livre(e)) then
    return 'indisponivel';
  end if;

  update estoque set status = 'reservado', pedido_id = pedido, reservado_ate = ped.expira_em, atualizado_em = now()
   where slug = any(slugs);
  return 'ok';
end;
$$;

-- Muda a situação do pedido e leva o estoque junto:
--   novo -> pares reservados · pago/enviado/entregue -> vendidos · cancelado -> voltam a ficar disponíveis
create or replace function public.atualizar_pedido(pedido bigint, novo_status text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  slugs text[];
begin
  if novo_status not in ('novo', 'pago', 'enviado', 'entregue', 'cancelado') then
    raise exception 'Situação inválida: %', novo_status;
  end if;

  select array_agg(item->>'slug') into slugs
    from pedidos p, jsonb_array_elements(p.itens) item where p.id = pedido;
  if slugs is null then
    raise exception 'Pedido % não encontrado.', pedido;
  end if;

  if novo_status in ('pago', 'enviado', 'entregue') and exists (
       select 1 from pedidos where id = pedido and origem = 'site' and coalesce(pagamento_status, '') <> 'approved') then
    raise exception 'Pedido do site sem pagamento aprovado no Mercado Pago. Não envie: confira o pagamento.';
  end if;
  if novo_status in ('pago', 'enviado', 'entregue') and exists (
       select 1 from pedidos where id = pedido
          and pagamento_status in ('refunded', 'charged_back', 'in_mediation', 'partially_refunded')) then
    raise exception 'Pagamento estornado ou em disputa no Mercado Pago. Não envie: confira o pagamento.';
  end if;

  -- voltar (ou reabrir) para 'novo' segura o par por 24 h, como uma venda nova do painel; sem prazo ele ficaria preso
  update pedidos set status = novo_status, atualizado_em = now(),
         expira_em = case when novo_status = 'novo' and (expira_em is null or expira_em < now())
                          then now() + interval '24 hours' else expira_em end
   where id = pedido;

  if novo_status = 'cancelado' then
    update estoque set status = 'disponivel', pedido_id = null, reservado_ate = null, atualizado_em = now()
     where slug = any(slugs) and pedido_id = pedido;
  else
    -- reabrir um cancelado só funciona se os pares ainda estiverem livres
    perform 1 from estoque where slug = any(slugs) for update;
    if exists (select 1 from estoque e where e.slug = any(slugs)
                and e.pedido_id is distinct from pedido and not par_livre(e)) then
      raise exception 'Algum par deste pedido já foi para outro pedido.';
    end if;
    update estoque
       set status = case when novo_status = 'novo' then 'reservado' else 'vendido' end,
           pedido_id = pedido, atualizado_em = now(),
           reservado_ate = case when novo_status = 'novo' then (select p.expira_em from pedidos p where p.id = pedido) end
     where slug = any(slugs);
  end if;
end;
$$;

-- Ajuste manual de um par pelo painel (fora de pedido): disponível, vendido, ou reservado por X horas.
create or replace function public.definir_estoque(par text, novo_status text, horas int default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if novo_status not in ('disponivel', 'reservado', 'vendido') then
    raise exception 'Situação inválida: %', novo_status;
  end if;
  if novo_status = 'reservado' and horas is not null and horas <= 0 then
    raise exception 'Informe as horas da reserva (1 ou mais).';
  end if;
  if exists (select 1 from estoque where slug = par and pedido_id is not null and status <> 'disponivel') then
    raise exception 'Este par está preso a um pedido. Mude a situação pelo pedido.';
  end if;

  insert into estoque (slug, status, reservado_ate, pedido_id, atualizado_em)
  values (par, novo_status,
          case when novo_status = 'reservado' then now() + make_interval(hours => coalesce(horas, 24)) end,
          null, now())
  on conflict (slug) do update
    set status = excluded.status, reservado_ate = excluded.reservado_ate,
        pedido_id = null, atualizado_em = now();
end;
$$;

-- Pagamento aprovado (aviso do Mercado Pago, volta da cliente ou conferência diária; sempre com a chave de serviço).
-- Devolve 'ok', 'ja_pago' (este mesmo pagamento já tratado: nada a avisar), 'dobro' (outro pagamento aprovado num
-- pedido que já estava pago: anota, marca aviso_pendente = 'dobro' e a equipe reembolsa), 'pago_no_painel' (pedido
-- marcado como pago à mão: liga o pagamento e pede conferência) ou 'conflito' (conferir:
-- par já foi para outra cliente, pedido cancelado pela equipe ou valor pago menor que o total). Em 'conflito' o pedido
-- NÃO vira pago e ganha uma observação para a equipe. Todo pagamento tratado entra em pagamentos_vistos, então o
-- aviso repetido (mesmo depois de outro caminho trocar pagamento_status) não anota nem avisa de novo.
-- Em 'ok' e 'conflito' marca aviso_pendente ('pago' ou 'conferir'): o site tira a marca quando o e-mail sai.
drop function if exists public.confirmar_pagamento(bigint, text);
drop function if exists public.confirmar_pagamento(bigint, text, numeric);
create or replace function public.confirmar_pagamento(pedido bigint, id_pagamento text, valor numeric)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  ped   pedidos;
  slugs text[];
begin
  select * into ped from pedidos where id = pedido for update;
  if ped.id is null then raise exception 'Pedido % não encontrado.', pedido; end if;
  -- o mesmo pagamento de novo (o Mercado Pago repete o aviso; a volta da cliente e a conferência também consultam):
  -- já foi tratado e avisado. 'ja_pago' é o valor que o código novo e o antigo entendem como "não avisar".
  -- (o Pix e o cartão em análise mantêm o mesmo id de pendente para aprovado: o id registrado no pedido NÃO quer dizer
  -- que já foi tratado; só pagamentos_vistos diz isso)
  if id_pagamento = any(ped.pagamentos_vistos) then return 'ja_pago'; end if;
  if ped.status in ('pago', 'enviado', 'entregue') and ped.pagamento_id is null then
    -- marcado como pago à mão no painel (ex.: a equipe viu o pagamento antes do aviso): liga este pagamento ao pedido
    -- e pede para a equipe conferir se é o mesmo dinheiro ou se a cliente pagou duas vezes
    update pedidos set pagamento_id = id_pagamento, pagamento_status = 'approved', aviso_pendente = 'pago_no_painel',
           pagamentos_vistos = array_append(pagamentos_vistos, id_pagamento), atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || format(' ATENÇÃO: pagamento %s aprovado no Mercado Pago num pedido já marcado como pago no painel. Conferir se a cliente pagou duas vezes.', id_pagamento))
     where id = pedido;
    return 'pago_no_painel';
  end if;
  if ped.status in ('pago', 'enviado', 'entregue') then
    -- a cliente pagou de novo um pedido já pago: o dinheiro está retido, a equipe precisa reembolsar
    update pedidos set aviso_pendente = 'dobro', pagamentos_vistos = array_append(pagamentos_vistos, id_pagamento),
           atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || format(' ATENÇÃO: pagamento %s aprovado em dobro (o pedido já estava pago). Reembolsar no Mercado Pago.', id_pagamento))
     where id = pedido;
    return 'dobro';
  end if;

  if valor is null or valor + 0.01 < ped.total then
    update pedidos set pagamento_id = id_pagamento, pagamento_status = 'valor_divergente', aviso_pendente = 'conferir',
           pagamentos_vistos = array_append(pagamentos_vistos, id_pagamento), atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || format(' ATENÇÃO: pagamento de R$ %s menor que o total R$ %s. Não enviar.', valor, ped.total))
     where id = pedido;
    return 'conflito';
  end if;

  -- cancelado pelo sistema (venceu, recusado, refeito pela cliente, par de outra cliente): os pares decidem abaixo;
  -- cancelado pela equipe: conflito
  if ped.status = 'cancelado' and coalesce(ped.pagamento_status, '') not in ('expirado', 'rejected', 'cancelled', 'erro_checkout', 'substituido', 'par_indisponivel') then
    update pedidos set pagamento_id = id_pagamento, pagamento_status = 'approved', aviso_pendente = 'conferir',
           pagamentos_vistos = array_append(pagamentos_vistos, id_pagamento), atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || ' ATENÇÃO: pagamento aprovado num pedido que a equipe cancelou. Conferir antes de enviar ou reembolsar.')
     where id = pedido;
    return 'conflito';
  end if;

  select array_agg(item->>'slug') into slugs from jsonb_array_elements(ped.itens) item;
  insert into estoque (slug) select unnest(slugs) on conflict (slug) do nothing;
  perform 1 from estoque where slug = any(slugs) for update;
  if exists (select 1 from estoque e where e.slug = any(slugs)
              and e.pedido_id is distinct from pedido and not par_livre(e)) then
    update pedidos set pagamento_id = id_pagamento, pagamento_status = 'approved', aviso_pendente = 'conferir',
           pagamentos_vistos = array_append(pagamentos_vistos, id_pagamento), atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || ' ATENÇÃO: pago depois que a reserva venceu e algum par já foi para outra cliente. Reembolsar ou oferecer troca.')
     where id = pedido;
    return 'conflito';
  end if;

  update pedidos set status = 'pago', pagamento_id = id_pagamento, pagamento_status = 'approved', aviso_pendente = 'pago',
         pagamentos_vistos = array_append(pagamentos_vistos, id_pagamento), expira_em = null, atualizado_em = now(),
         observacoes = case when valor > ped.total + 0.01
           then trim(both ' ' from coalesce(observacoes, '') || format(' ATENÇÃO: pagamento de R$ %s, R$ %s a mais que o total. Conferir se devolve a diferença.', valor, valor - ped.total))
           else observacoes end
   where id = pedido;
  update estoque set status = 'vendido', pedido_id = pedido, reservado_ate = null, atualizado_em = now()
   where slug = any(slugs);
  return 'ok';
end;
$$;

-- Pagamento do site recusado/cancelado: cancela o pedido (se ainda não foi pago) e devolve os pares.
-- Pagamento aprovado de pedido em conflito continua registrado (como em cancelar_expirados).
-- Com id_pagamento: a recusa de OUTRA tentativa (ex.: cartão recusado depois de a cliente gerar o Pix) não cancela o
-- pedido enquanto o pagamento registrado nele ainda vale (Pix pendente, cartão em análise, aprovado).
drop function if exists public.cancelar_pedido_site(bigint, text);
create or replace function public.cancelar_pedido_site(pedido bigint, situacao text, id_pagamento text default null)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update pedidos set status = 'cancelado', atualizado_em = now(),
         pagamento_status = case when pagamento_status in ('approved', 'valor_divergente') then pagamento_status else situacao end
   where id = pedido and origem = 'site' and status = 'novo'
     and not (id_pagamento is not null and pagamento_id is not null and pagamento_id <> id_pagamento
              and coalesce(pagamento_status, '') in ('pending', 'in_process', 'authorized', 'approved', 'valor_divergente'));
  if found then
    update estoque set status = 'disponivel', pedido_id = null, reservado_ate = null, atualizado_em = now()
     where pedido_id = pedido and status = 'reservado';
  end if;
end;
$$;

-- Estorno, devolução ou disputa de um pagamento no Mercado Pago. Devolve:
--   a situação do pedido antes (pago/enviado/entregue): marcou 'NÃO ENVIAR' e aviso_pendente = 'estorno';
--   'outro_pagamento': é de outro pagamento, não do que o pedido registrou. Pedido não pago: qualquer outro (o
--         registrado pode ser um Pix novo ainda pendente). Pedido pago: só quando o registrado é um pagamento que foi
--         aprovado (cliente que pagou duas vezes); o pedido continua valendo e ganha uma nota;
--   null: pedido não pago (conflito ou cancelado: só anota a situação, para o painel não deixar marcar como pago um
--         pagamento devolvido) ou o mesmo estorno avisado de novo.
-- Pedido pago sem pagamento aprovado registrado (marcado como pago à mão no painel) fica com o lado seguro: 'NÃO ENVIAR'.
-- Sem id_pagamento (código antigo) vale para o pedido, como antes.
drop function if exists public.registrar_estorno(bigint, text);
create or replace function public.registrar_estorno(pedido bigint, situacao text, id_pagamento text default null)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  ped  pedidos;
  nota text;
begin
  select * into ped from pedidos where id = pedido for update;
  if ped.id is null then return null; end if;

  if id_pagamento is not null and ped.pagamento_id is not null and ped.pagamento_id <> id_pagamento
     and (ped.status not in ('pago', 'enviado', 'entregue')
          or ped.pagamento_status in ('approved', 'valor_divergente', 'refunded', 'charged_back', 'in_mediation', 'partially_refunded')) then
    nota := format('Pagamento extra %s ficou %s no Mercado Pago; o pedido continua valendo.', id_pagamento, situacao);
    if ped.status in ('pago', 'enviado', 'entregue') and position(nota in coalesce(ped.observacoes, '')) = 0 then
      -- o pagamento extra foi devolvido: o aviso de "reembolsar" não vale mais
      update pedidos set observacoes = trim(both ' ' from coalesce(observacoes, '') || ' ' || nota), atualizado_em = now(),
             aviso_pendente = case when aviso_pendente = 'dobro' then null else aviso_pendente end
       where id = pedido;
    end if;
    return 'outro_pagamento';
  end if;

  if ped.status not in ('pago', 'enviado', 'entregue') then
    if id_pagamento is not null and ped.pagamento_status is distinct from situacao then
      update pedidos set pagamento_status = situacao, atualizado_em = now() where id = pedido;
    end if;
    return null;
  end if;

  if ped.pagamento_status is not distinct from situacao then return null; end if; -- o mesmo estorno avisado de novo
  update pedidos set pagamento_status = situacao, aviso_pendente = 'estorno', atualizado_em = now(),
         observacoes = trim(both ' ' from coalesce(observacoes, '') || format(' NÃO ENVIAR: pagamento %s no Mercado Pago.', situacao))
   where id = pedido;
  return ped.status;
end;
$$;

-- Trava no banco para quem entra com a sessão do navegador (equipe no painel): os dados do pagamento são do sistema
-- (aviso do Mercado Pago, com a chave de serviço). Assim, nem direto pela API do Supabase dá para marcar como pago um
-- pedido do site sem pagamento aprovado, nem mandar um pedido com pagamento estornado.
create or replace function public.proteger_pagamento()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  if tg_op = 'DELETE' then
    if old.origem = 'site' or old.pagamento_id is not null then
      raise exception 'Pedido do site ou com pagamento não pode ser apagado: cancele pelo painel.';
    end if;
    return old;
  end if;

  if tg_op = 'INSERT' then
    if new.origem = 'site' or new.pagamento_id is not null or new.pagamento_status is not null
       or coalesce(array_length(new.pagamentos_vistos, 1), 0) > 0 then
      raise exception 'Pedido do site e dados de pagamento só o sistema cria.';
    end if;
    return new;
  end if;

  -- cancelar_expirados (que o painel também roda) só pode marcar 'expirado' ao cancelar um pedido vencido
  if new.origem is distinct from old.origem or new.codigo_publico is distinct from old.codigo_publico
     or new.pagamento_id is distinct from old.pagamento_id
     or new.pagamentos_vistos is distinct from old.pagamentos_vistos
     or new.aviso_pendente is distinct from old.aviso_pendente
     or (new.pagamento_status is distinct from old.pagamento_status
         and not (old.status = 'novo' and new.status = 'cancelado' and new.pagamento_status = 'expirado'
                  and old.expira_em < now()
                  and coalesce(old.pagamento_status, '') in ('', 'pending', 'in_process', 'authorized', 'rejected', 'cancelled'))) then
    raise exception 'Os dados do pagamento deste pedido só o sistema muda.';
  end if;

  if new.status in ('pago', 'enviado', 'entregue') and new.status is distinct from old.status then
    if new.origem = 'site' and coalesce(new.pagamento_status, '') <> 'approved' then
      raise exception 'Pedido do site sem pagamento aprovado no Mercado Pago. Não envie: confira o pagamento.';
    end if;
    if new.pagamento_status in ('refunded', 'charged_back', 'in_mediation', 'partially_refunded') then
      raise exception 'Pagamento estornado ou em disputa no Mercado Pago. Não envie: confira o pagamento.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists proteger_pagamento on public.pedidos;
create trigger proteger_pagamento before insert or update or delete on public.pedidos
  for each row execute function public.proteger_pagamento();

grant execute on function public.par_livre(public.estoque) to anon, authenticated;
grant execute on function public.registrar_estorno(bigint, text, text) to service_role;
revoke execute on function public.registrar_estorno(bigint, text, text) from public, anon, authenticated;
grant execute on function public.cancelar_expirados() to authenticated, service_role;
grant execute on function public.criar_pedido(jsonb) to service_role;
grant execute on function public.confirmar_pagamento(bigint, text, numeric) to service_role;
grant execute on function public.cancelar_pedido_site(bigint, text, text) to service_role;
grant execute on function public.substituir_pedidos_site(bigint, text) to service_role;
grant execute on function public.pedidos_substituiveis(text, text, text, bigint) to service_role;
grant execute on function public.reservar_pedido(bigint) to service_role;
revoke execute on function public.reservar_pedido(bigint) from public, anon, authenticated;
revoke execute on function public.cancelar_expirados() from public, anon;
revoke execute on function public.confirmar_pagamento(bigint, text, numeric) from public, anon, authenticated;
revoke execute on function public.cancelar_pedido_site(bigint, text, text) from public, anon, authenticated;
revoke execute on function public.substituir_pedidos_site(bigint, text) from public, anon, authenticated;
revoke execute on function public.pedidos_substituiveis(text, text, text, bigint) from public, anon, authenticated;
grant execute on function public.criar_pedido(jsonb) to authenticated;
grant execute on function public.atualizar_pedido(bigint, text) to authenticated;
grant execute on function public.definir_estoque(text, text, int) to authenticated;
revoke execute on function public.criar_pedido(jsonb) from public, anon;
revoke execute on function public.atualizar_pedido(bigint, text) from public, anon;
revoke execute on function public.definir_estoque(text, text, int) from public, anon;
