create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  vendor text not null,
  price numeric(10,2) not null check (price >= 0),
  unit text not null,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  availability text not null default 'available' check (availability in ('available', 'unavailable')),
  is_featured boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists health_info text not null default '';
alter table public.products add column if not exists growing_location text not null default '';
alter table public.products add column if not exists market_location text not null default '';
alter table public.products add column if not exists dish_ideas text not null default '';

create unique index if not exists products_barcode_unique
  on public.products (barcode)
  where barcode is not null and barcode <> '';

create table if not exists public.inventory_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

alter table public.products enable row level security;
alter table public.inventory_admins enable row level security;

revoke all on public.products from anon, authenticated;
grant select on public.products to anon, authenticated;
grant insert, update on public.products to authenticated;
revoke all on public.inventory_admins from anon, authenticated;

create or replace function public.is_inventory_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.inventory_admins
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_inventory_admin() from public;
grant execute on function public.is_inventory_admin() to authenticated;

drop policy if exists "Products are publicly readable" on public.products;
create policy "Products are publicly readable"
  on public.products for select to anon, authenticated
  using (true);

drop policy if exists "Admins can add products" on public.products;
create policy "Admins can add products"
  on public.products for insert to authenticated
  with check ((select public.is_inventory_admin()));

drop policy if exists "Admins can update products" on public.products;
create policy "Admins can update products"
  on public.products for update to authenticated
  using ((select public.is_inventory_admin()))
  with check ((select public.is_inventory_admin()));

do $$
begin
  alter publication supabase_realtime add table public.products;
exception
  when duplicate_object then null;
end;
$$;

insert into public.products (name, vendor, price, unit, stock_quantity, is_featured) values
  ('Heirloom tomatoes', 'Hollow Creek Farm', 4.20, 'lb', 18, true),
  ('Baby spinach', 'Riverside Growers', 3.10, 'bag', 14, true),
  ('Sourdough loaf', 'Millhouse Bakery', 6.50, 'loaf', 8, true),
  ('Free-range eggs', 'Blue Barn Poultry', 5.90, 'dozen', 12, true),
  ('Wildflower honey', 'Cedar Row Apiary', 8.00, 'jar', 7, true),
  ('Delicata squash', 'Hollow Creek Farm', 2.75, 'each', 16, true),
  ('Rainbow carrots', 'Meadow Lane Farm', 3.40, 'bunch', 12, false),
  ('French breakfast radishes', 'Riverside Growers', 3.25, 'bunch', 12, false),
  ('English cucumbers', 'Hollow Creek Farm', 2.10, 'each', 12, false),
  ('Sweet corn', 'Sunfield Acres', 1.25, 'ear', 24, false),
  ('Japanese eggplant', 'Meadow Lane Farm', 3.80, 'lb', 10, false),
  ('Red bell peppers', 'Sunfield Acres', 2.95, 'lb', 12, false),
  ('Green bell peppers', 'Sunfield Acres', 2.60, 'lb', 12, false),
  ('Zucchini', 'Riverside Growers', 2.40, 'lb', 14, false),
  ('Persian cucumbers', 'Hollow Creek Farm', 3.50, 'basket', 10, false),
  ('Rainbow chard', 'Riverside Growers', 3.75, 'bunch', 9, false),
  ('Kale', 'Meadow Lane Farm', 2.90, 'bunch', 12, false),
  ('Butter lettuce', 'Hollow Creek Farm', 3.20, 'head', 10, false),
  ('Green cabbage', 'Sunfield Acres', 2.35, 'head', 12, false),
  ('Cauliflower', 'Riverside Growers', 4.10, 'head', 8, false),
  ('Broccoli crowns', 'Meadow Lane Farm', 3.60, 'lb', 10, false),
  ('Red onions', 'Sunfield Acres', 2.20, 'lb', 16, false),
  ('Golden beets', 'Hollow Creek Farm', 3.15, 'bunch', 10, false),
  ('French green beans', 'Meadow Lane Farm', 4.25, 'lb', 9, false),
  ('Sugar snap peas', 'Riverside Growers', 5.50, 'lb', 8, false),
  ('Cherry tomatoes', 'Hollow Creek Farm', 4.75, 'pint', 10, false),
  ('Poblano peppers', 'Sunfield Acres', 3.20, 'lb', 10, false),
  ('Butternut squash', 'Meadow Lane Farm', 2.80, 'lb', 12, false),
  ('Fresh basil', 'Riverside Growers', 2.50, 'bunch', 15, false),
  ('Cilantro', 'Hollow Creek Farm', 1.75, 'bunch', 12, false)
on conflict (name) do nothing;
