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
  shipping_cost integer, -- in pence; estimated UK shipping, shown to buyers
  international_shipping_cost integer, -- in pence; estimated international shipping
  status text not null default 'available', -- available / unavailable / sold
  description text not null,
  image text,
  images text[], -- multiple photos; first one is the cover photo
  icon text not null default 'generic',
  ebay_item_id text unique, -- links this product to its eBay listing, for sync matching
  is_draft boolean not null default false, -- true = imported from eBay, awaiting review; hidden from the public site until published
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

-- Caches auto-translated product name/description per language, so a
-- product is only translated once (not on every single page view). Rows
-- are created on demand by the /api/translate-product route the first
-- time someone views a product in that language.
create table product_translations (
  product_id uuid not null references products(id) on delete cascade,
  lang text not null,
  name text not null,
  description text not null,
  created_at timestamptz not null default now(),
  primary key (product_id, lang)
);
alter table product_translations enable row level security;
create policy "Public can read product translations"
  on product_translations for select
  using (true);

-- Every completed sale, recorded automatically by the Stripe webhook —
-- this is the source of truth for accounting/HMRC reporting, not
-- something anyone needs to fill in by hand.
create table orders (
  id uuid primary key default gen_random_uuid(),
  stripe_session_id text unique not null,
  customer_email text,
  customer_name text,
  customer_phone text,
  shipping_address jsonb,
  delivery_notes text,
  items jsonb not null, -- [{slug, name, price, cost_price, shipping_display_name}]
  subtotal integer not null, -- pence, items only
  shipping_amount integer not null default 0, -- pence
  total integer not null, -- pence, what the buyer actually paid
  currency text not null default 'gbp',
  created_at timestamptz not null default now()
);
alter table orders enable row level security;
-- Intentionally no public policies: only the service role (webhook +
-- admin API) can read or write this table — order/customer data is
-- sensitive and never exposed to visitors.
-- Writes only via the service role (admin API), same pattern as products.

-- Maps an eBay category ID to the matching site category/subcategory, so
-- the eBay sync can auto-assign a category to each imported draft.
-- Populate this as real eBay category IDs show up during import — an
-- unmapped category just leaves the draft's category blank for manual
-- review, no code changes needed to add a new mapping.
create table category_mapping (
  ebay_category_id text primary key,
  site_category text not null, -- matches a Category.slug in lib/products.ts
  site_subcategory text,
  created_at timestamptz not null default now()
);
alter table category_mapping enable row level security;
-- Admin-only, same pattern as products writes.

-- MIGRATION: if you already ran this file before (table already exists),
-- just run this one line separately in SQL Editor to add the new "era"
-- field without losing any existing products:
-- alter table products add column if not exists era text;
-- alter table products add column if not exists cost_price integer;
-- alter table products add column if not exists status text not null default 'available';
-- alter table products drop constraint if exists products_category_check;
-- alter table products add column if not exists images text[];
-- alter table products add column if not exists shipping_cost integer;
-- alter table products add column if not exists international_shipping_cost integer;
-- create table if not exists product_translations (
--   product_id uuid not null references products(id) on delete cascade,
--   lang text not null,
--   name text not null,
--   description text not null,
--   created_at timestamptz not null default now(),
--   primary key (product_id, lang)
-- );
-- alter table product_translations enable row level security;
-- create policy "Public can read product translations" on product_translations for select using (true);
-- create table if not exists orders (
--   id uuid primary key default gen_random_uuid(),
--   stripe_session_id text unique not null,
--   customer_email text,
--   customer_name text,
--   customer_phone text,
--   shipping_address jsonb,
--   delivery_notes text,
--   items jsonb not null,
--   subtotal integer not null,
--   shipping_amount integer not null default 0,
--   total integer not null,
--   currency text not null default 'gbp',
--   created_at timestamptz not null default now()
-- );
-- alter table orders enable row level security;
-- alter table products add column if not exists ebay_item_id text unique;
-- alter table products add column if not exists is_draft boolean not null default false;
-- create table if not exists category_mapping (
--   ebay_category_id text primary key,
--   site_category text not null,
--   site_subcategory text,
--   created_at timestamptz not null default now()
-- );
-- alter table category_mapping enable row level security;
