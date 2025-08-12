-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Profiles with role
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz default now()
);

-- Production per day
create table if not exists public.productions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users(id) on delete cascade,
  prod_date date not null,
  abate int not null check (abate >= 0),
  mocoto_prod numeric not null default 0, -- UN
  bucho_prod numeric not null default 0,  -- KG
  tripa_prod numeric not null default 0,  -- KG
  -- metas = 4 por animal
  mocoto_meta numeric generated always as (abate * 4) stored,
  bucho_meta numeric generated always as (abate * 4) stored,
  tripa_meta numeric generated always as (abate * 4) stored,
  -- diferenças = meta - produção
  mocoto_dif numeric generated always as (mocoto_meta - mocoto_prod) stored,
  bucho_dif numeric generated always as (bucho_meta - bucho_prod) stored,
  tripa_dif numeric generated always as (tripa_meta - tripa_prod) stored,
  -- médias = produção / abate (nullif evita dividir por 0)
  mocoto_media numeric generated always as (case when abate > 0 then mocoto_prod / abate::numeric else null end) stored,
  bucho_media numeric generated always as (case when abate > 0 then bucho_prod / abate::numeric else null end) stored,
  tripa_media numeric generated always as (case when abate > 0 then tripa_prod / abate::numeric else null end) stored,
  created_at timestamptz default now()
);

-- Inventory ledger
create table if not exists public.inventory_transactions (
  id uuid primary key default gen_random_uuid(),
  item text not null check (item in ('mocoto','bucho','tripa')),
  quantity numeric not null,
  unit text not null, -- 'UN' or 'KG'
  tx_type text not null check (tx_type in ('entrada','saida','ajuste')),
  source_production_id uuid null references public.productions(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete set null,
  created_at timestamptz default now()
);

-- Keep inventory in sync: after insert/update/delete on productions
create or replace function public.sync_inventory_from_production()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'DELETE') then
    delete from public.inventory_transactions where source_production_id = old.id;
    return old;
  end if;

  -- For insert and update: delete old entries and insert fresh ones
  delete from public.inventory_transactions where source_production_id = new.id;

  if (new.mocoto_prod is not null and new.mocoto_prod <> 0) then
    insert into public.inventory_transactions (item, quantity, unit, tx_type, source_production_id, created_by)
    values ('mocoto', new.mocoto_prod, 'UN', 'entrada', new.id, new.author_id);
  end if;
  if (new.bucho_prod is not null and new.bucho_prod <> 0) then
    insert into public.inventory_transactions (item, quantity, unit, tx_type, source_production_id, created_by)
    values ('bucho', new.bucho_prod, 'KG', 'entrada', new.id, new.author_id);
  end if;
  if (new.tripa_prod is not null and new.tripa_prod <> 0) then
    insert into public.inventory_transactions (item, quantity, unit, tx_type, source_production_id, created_by)
    values ('tripa', new.tripa_prod, 'KG', 'entrada', new.id, new.author_id);
  end if;
  return new;
end $$;

drop trigger if exists trg_sync_inventory_insert on public.productions;
create trigger trg_sync_inventory_insert
after insert or update on public.productions
for each row execute function public.sync_inventory_from_production();

drop trigger if exists trg_sync_inventory_delete on public.productions;
create trigger trg_sync_inventory_delete
after delete on public.productions
for each row execute function public.sync_inventory_from_production();

-- Inventory balance view
create or replace view public.inventory_balances as
select
  item,
  sum(case tx_type when 'entrada' then quantity when 'saida' then -quantity when 'ajuste' then quantity else 0 end) as saldo,
  max(created_at) as updated_at
from public.inventory_transactions
group by item;

-- RLS
alter table public.profiles enable row level security;
alter table public.productions enable row level security;
alter table public.inventory_transactions enable row level security;

-- Profiles policies
create policy "Profiles are viewable by all" on public.profiles for select using (true);
create policy "Users manage own profile" on public.profiles for update using (auth.uid() = id);

-- Helper: check if current user is admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql stable as $$
  select exists (select 1 from public.profiles p where p.id = uid and p.role = 'admin')
$$;

-- Productions policies
create policy "Anyone authenticated can read productions"
  on public.productions for select using (true);

create policy "Users can insert their own productions"
  on public.productions for insert with check (auth.uid() = author_id);

create policy "Users can update own productions"
  on public.productions for update using (auth.uid() = author_id);

create policy "Admins can do anything on productions"
  on public.productions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Inventory policies
create policy "Read inventory for all authenticated"
  on public.inventory_transactions for select using (true);

create policy "Users can insert their own manual transactions"
  on public.inventory_transactions for insert
  with check (auth.uid() = created_by and source_production_id is null);

create policy "Users can update own manual transactions"
  on public.inventory_transactions for update using (auth.uid() = created_by and source_production_id is null);

create policy "Admins can manage all inventory transactions"
  on public.inventory_transactions for all using (public.is_admin(auth.uid())) with check (public.is_admin(auth.uid()));

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, role)
  values (new.id, coalesce(split_part(new.email,'@',1), left(new.id::text,8)), 'user')
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();
