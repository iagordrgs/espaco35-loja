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

create index if not exists pedidos_criado_em_idx on public.pedidos (criado_em desc);
create index if not exists pedidos_status_idx on public.pedidos (status);

-- ───────────── acesso (RLS) ─────────────
-- Site público: só LÊ a situação dos pares (sem dado de cliente).
-- Painel: quem fez login (usuários criados por você no Supabase) lê e escreve tudo.

alter table public.estoque enable row level security;
alter table public.pedidos enable row level security;

drop policy if exists "estoque leitura publica" on public.estoque;
create policy "estoque leitura publica" on public.estoque
  for select to anon, authenticated using (true);

drop policy if exists "estoque escrita painel" on public.estoque;
create policy "estoque escrita painel" on public.estoque
  for all to authenticated using (true) with check (true);

drop policy if exists "pedidos painel" on public.pedidos;
create policy "pedidos painel" on public.pedidos
  for all to authenticated using (true) with check (true);

-- ───────────── funções ─────────────

-- Par livre para vender: sem linha, disponível, ou reserva manual vencida.
create or replace function public.par_livre(e public.estoque)
returns boolean language sql stable as $$
  select e.slug is null
      or e.status = 'disponivel'
      or (e.status = 'reservado' and e.pedido_id is null and e.reservado_ate is not null and e.reservado_ate < now());
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
  slugs      text[];
  ocupados   text[];
begin
  select array_agg(item->>'slug') into slugs from jsonb_array_elements(dados->'itens') item;
  if slugs is null or array_length(slugs, 1) = 0 then
    raise exception 'Pedido sem pares.';
  end if;

  -- garante uma linha por par e trava todas antes de conferir
  insert into estoque (slug) select unnest(slugs) on conflict (slug) do nothing;
  perform 1 from estoque where slug = any(slugs) for update;

  select array_agg(e.slug) into ocupados
    from estoque e where e.slug = any(slugs) and not par_livre(e);
  if ocupados is not null then
    raise exception 'Par indisponível: %', array_to_string(ocupados, ', ');
  end if;

  insert into pedidos (status, cliente_nome, cliente_telefone, cliente_cidade, itens,
                       subtotal, desconto, frete, total, pagamento, entrega, vendedor, observacoes)
  values (st, dados->>'cliente_nome', dados->>'cliente_telefone', dados->>'cliente_cidade', dados->'itens',
          coalesce((dados->>'subtotal')::numeric, 0), coalesce((dados->>'desconto')::numeric, 0),
          coalesce((dados->>'frete')::numeric, 0), coalesce((dados->>'total')::numeric, 0),
          dados->>'pagamento', dados->>'entrega', dados->>'vendedor', dados->>'observacoes')
  returning id into novo_id;

  update estoque
     set status = case when st = 'novo' then 'reservado' else 'vendido' end,
         pedido_id = novo_id, reservado_ate = null, atualizado_em = now()
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

grant execute on function public.par_livre(public.estoque) to anon, authenticated;
grant execute on function public.criar_pedido(jsonb) to authenticated;
grant execute on function public.atualizar_pedido(bigint, text) to authenticated;
grant execute on function public.definir_estoque(text, text, int) to authenticated;
revoke execute on function public.criar_pedido(jsonb) from public, anon;
revoke execute on function public.atualizar_pedido(bigint, text) from public, anon;
revoke execute on function public.definir_estoque(text, text, int) from public, anon;
