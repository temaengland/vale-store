-- Run this once in Supabase: Project -> SQL Editor -> New query -> paste -> Run

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  price integer not null, -- pence
  category text not null,
  subcategory text,
  era text,
  cost_price integer, -- in pence; what you paid for it — never shown publicly
  status text not null default 'available', -- available / sold
  description text not null,
  image text,
  icon text not null default 'generic',
  created_at timestamptz not null default now()
);

-- Allow the public storefront to read products (anon key, read-only).
alter table products enable row level security;
create policy "Public can read products"
  on products for select
  using (true);

-- Writes (insert/update/delete) are done only via the admin API routes,
-- which use the service role key and bypass RLS -- so no public write
-- policy is created here. That's intentional.

-- Storage bucket for product photos.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

create policy "Public can view product images"
  on storage.objects for select
  using (bucket_id = 'product-images');

-- Enquiries left by visitors (WhatsApp/email form on each product page).
-- Only the admin (service role key) can read these -- no public select policy,
-- so visitor details stay private.
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  message text not null,
  product_slug text,
  product_name text,
  status text not null default 'new', -- new / contacted / won / lost
  created_at timestamptz not null default now()
);

alter table inquiries enable row level security;
-- Intentionally no public policies: only the service role (admin API) can
-- read or write this table.

-- MIGRATION: if you already ran this file before (table already exists),
-- just run this one line separately in SQL Editor to add the new "era"
-- field without losing any existing products:
-- alter table products add column if not exists era text;
-- alter table products add column if not exists cost_price integer;
-- alter table products add column if not exists status text not null default 'available';
-- alter table products drop constraint if exists products_category_check;
