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
    update pedidos set status = 'cancelado', pagamento_status = 'expirado', atualizado_em = now()
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

-- Cria o pedido e segura os pares. Status 'novo' reserva; 'pago'/'enviado'/'entregue' já vende.
-- Falha (e não grava nada) se algum par já estiver reservado ou vendido.
create or replace function public.criar_pedido(dados jsonb)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  novo_id    bigint;
  st         text := coalesce(dados->>'status', 'novo');
  prazo      timestamptz := case when (dados->>'reservar_minutos') is not null
                                 then now() + make_interval(mins => (dados->>'reservar_minutos')::int) end;
  slugs      text[];
  ocupados   text[];
begin
  select array_agg(item->>'slug') into slugs from jsonb_array_elements(dados->'itens') item;
  if slugs is null or array_length(slugs, 1) = 0 then
    raise exception 'Pedido sem pares.';
  end if;
  perform cancelar_expirados();

  -- garante uma linha por par e trava todas antes de conferir
  insert into estoque (slug) select unnest(slugs) on conflict (slug) do nothing;
  perform 1 from estoque where slug = any(slugs) for update;

  select array_agg(e.slug) into ocupados
    from estoque e where e.slug = any(slugs) and not par_livre(e);
  if ocupados is not null then
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

  update estoque
     set status = case when st = 'novo' then 'reservado' else 'vendido' end,
         pedido_id = novo_id, reservado_ate = case when st = 'novo' then prazo end, atualizado_em = now()
   where slug = any(slugs);

  return novo_id;
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

  update pedidos set status = novo_status, atualizado_em = now() where id = pedido;

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
           pedido_id = pedido, reservado_ate = null, atualizado_em = now()
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

-- Pagamento do site aprovado (chamado pelo aviso do Mercado Pago, com a chave de serviço).
-- Devolve 'ok', 'ja_pago' ou 'conflito' (conferir: par já foi para outra cliente, pedido cancelado pela equipe
-- ou valor pago menor que o total). Em 'conflito' o pedido NÃO vira pago e ganha uma observação para a equipe.
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
  if ped.status in ('pago', 'enviado', 'entregue') then return 'ja_pago'; end if;

  if valor is null or valor + 0.01 < ped.total then
    update pedidos set pagamento_id = id_pagamento, pagamento_status = 'valor_divergente', atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || format(' ATENÇÃO: pagamento de R$ %s menor que o total R$ %s. Não enviar.', valor, ped.total))
     where id = pedido;
    return 'conflito';
  end if;

  if ped.status = 'cancelado' and coalesce(ped.pagamento_status, '') not in ('expirado', 'rejected', 'cancelled', 'erro_checkout') then
    update pedidos set pagamento_id = id_pagamento, pagamento_status = 'approved', atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || ' ATENÇÃO: pagamento aprovado num pedido que a equipe cancelou. Conferir antes de enviar ou reembolsar.')
     where id = pedido;
    return 'conflito';
  end if;

  select array_agg(item->>'slug') into slugs from jsonb_array_elements(ped.itens) item;
  insert into estoque (slug) select unnest(slugs) on conflict (slug) do nothing;
  perform 1 from estoque where slug = any(slugs) for update;
  if exists (select 1 from estoque e where e.slug = any(slugs)
              and e.pedido_id is distinct from pedido and not par_livre(e)) then
    update pedidos set pagamento_id = id_pagamento, pagamento_status = 'approved', atualizado_em = now(),
           observacoes = trim(both ' ' from coalesce(observacoes, '') || ' ATENÇÃO: pago depois que a reserva venceu e algum par já foi para outra cliente. Reembolsar ou oferecer troca.')
     where id = pedido;
    return 'conflito';
  end if;

  update pedidos set status = 'pago', pagamento_id = id_pagamento, pagamento_status = 'approved',
         expira_em = null, atualizado_em = now()
   where id = pedido;
  update estoque set status = 'vendido', pedido_id = pedido, reservado_ate = null, atualizado_em = now()
   where slug = any(slugs);
  return 'ok';
end;
$$;

-- Pagamento do site recusado/cancelado: cancela o pedido (se ainda não foi pago) e devolve os pares.
create or replace function public.cancelar_pedido_site(pedido bigint, situacao text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update pedidos set status = 'cancelado', pagamento_status = situacao, atualizado_em = now()
   where id = pedido and origem = 'site' and status = 'novo';
  if found then
    update estoque set status = 'disponivel', pedido_id = null, reservado_ate = null, atualizado_em = now()
     where pedido_id = pedido and status = 'reservado';
  end if;
end;
$$;

-- Estorno, devolução ou disputa no Mercado Pago depois do pedido pago: marca 'NÃO ENVIAR'.
-- Devolve a situação do pedido antes (para o aviso), ou null se ele ainda não estava pago.
create or replace function public.registrar_estorno(pedido bigint, situacao text)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  antes text;
begin
  select status into antes from pedidos where id = pedido and status in ('pago', 'enviado', 'entregue') for update;
  if antes is null then return null; end if;
  update pedidos set pagamento_status = situacao, atualizado_em = now(),
         observacoes = trim(both ' ' from coalesce(observacoes, '') || format(' NÃO ENVIAR: pagamento %s no Mercado Pago.', situacao))
   where id = pedido;
  return antes;
end;
$$;

grant execute on function public.par_livre(public.estoque) to anon, authenticated;
grant execute on function public.registrar_estorno(bigint, text) to service_role;
revoke execute on function public.registrar_estorno(bigint, text) from public, anon, authenticated;
grant execute on function public.cancelar_expirados() to authenticated, service_role;
grant execute on function public.criar_pedido(jsonb) to service_role;
grant execute on function public.confirmar_pagamento(bigint, text, numeric) to service_role;
grant execute on function public.cancelar_pedido_site(bigint, text) to service_role;
revoke execute on function public.cancelar_expirados() from public, anon;
revoke execute on function public.confirmar_pagamento(bigint, text, numeric) from public, anon, authenticated;
revoke execute on function public.cancelar_pedido_site(bigint, text) from public, anon, authenticated;
grant execute on function public.criar_pedido(jsonb) to authenticated;
grant execute on function public.atualizar_pedido(bigint, text) to authenticated;
grant execute on function public.definir_estoque(text, text, int) to authenticated;
revoke execute on function public.criar_pedido(jsonb) from public, anon;
revoke execute on function public.atualizar_pedido(bigint, text) from public, anon;
revoke execute on function public.definir_estoque(text, text, int) from public, anon;
