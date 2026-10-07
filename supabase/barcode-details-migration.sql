-- Run once in the Supabase SQL Editor to enable barcode matching and produce details.
alter table public.products add column if not exists barcode text;
alter table public.products add column if not exists health_info text not null default '';
alter table public.products add column if not exists growing_location text not null default '';
alter table public.products add column if not exists market_location text not null default '';
alter table public.products add column if not exists dish_ideas text not null default '';

create unique index if not exists products_barcode_unique
  on public.products (barcode)
  where barcode is not null and barcode <> '';
