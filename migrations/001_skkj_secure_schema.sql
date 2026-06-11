-- SKKJ Autopart secure Supabase setup
-- Run this in Supabase SQL Editor after checking the project is correct.
-- This file does not contain private keys.

create extension if not exists pgcrypto;

do $$ begin
  create type public.app_role as enum ('customer', 'admin', 'owner');
exception when duplicate_object then null;
end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'customer',
  display_name text,
  phone text,
  line_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name_th text not null,
  name_en text not null default '',
  brand_th text not null default '',
  brand_en text not null default '',
  model_th text not null default '',
  model_en text not null default '',
  model_aliases text[] not null default '{}',
  part_type_th text not null default 'แร็คพวงมาลัย',
  part_type_en text not null default 'Steering rack',
  keywords_th text[] not null default '{}',
  keywords_en text[] not null default '{}',
  year_from int,
  year_to int,
  drive_side text not null default 'right' check (drive_side in ('right', 'left', 'both')),
  price numeric(12,2) not null default 0 check (price >= 0),
  stock int not null default 0 check (stock >= 0),
  active boolean not null default true,
  visible boolean not null default true,
  image_paths text[] not null default '{}',
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  name text not null default '',
  phone text not null default '',
  line_id text,
  email text,
  addresses jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default ('SKKJ-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  profile_id uuid references public.profiles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_snapshot jsonb not null default '{}'::jsonb,
  items jsonb not null default '[]'::jsonb,
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  payment_method text not null default 'promptpay' check (payment_method in ('bank_transfer', 'promptpay', 'cod', 'express_grab')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'submitted', 'paid', 'rejected', 'refunded')),
  order_status text not null default 'received' check (order_status in ('received', 'packing', 'shipping', 'delivered', 'cancelled')),
  shipping_method text not null default 'normal' check (shipping_method in ('normal', 'express_grab')),
  shipping_record jsonb not null default '{}'::jsonb,
  payment_slip_path text,
  printed_label boolean not null default false,
  printed_at timestamptz,
  tracking_number text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  language text not null default 'th' check (language in ('th', 'en', 'mixed')),
  status text not null default 'open' check (status in ('open', 'closed', 'needs_staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  sender text not null check (sender in ('customer', 'bot', 'admin', 'system')),
  message text not null,
  sanitized_message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.chat_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions(id) on delete cascade,
  summary_th text not null default '',
  summary_en text not null default '',
  car_info jsonb not null default '{}'::jsonb,
  suggested_product_ids uuid[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_action_logs (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references auth.users(id) on delete set null,
  role public.app_role,
  action_type text not null,
  related_product_id uuid references public.products(id) on delete set null,
  related_order_id uuid references public.orders(id) on delete set null,
  related_customer_id uuid references public.customers(id) on delete set null,
  old_value jsonb,
  new_value jsonb,
  confirmation_status text not null default 'pending' check (confirmation_status in ('pending', 'confirmed', 'owner_approved', 'rejected')),
  ip_address text,
  user_agent text,
  original_chat_message text,
  created_at timestamptz not null default now()
);

create table if not exists public.rate_limits (
  id uuid primary key default gen_random_uuid(),
  rate_key text not null,
  action_type text not null,
  window_start timestamptz not null default date_trunc('minute', now()),
  request_count int not null default 1,
  created_at timestamptz not null default now(),
  unique (rate_key, action_type, window_start)
);

create table if not exists public.abuse_logs (
  id uuid primary key default gen_random_uuid(),
  rate_key text,
  action_type text not null,
  detail jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.current_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'customer'::public.app_role);
$$;

create or replace function public.is_admin_or_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() in ('admin', 'owner');
$$;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.current_role() = 'owner';
$$;

create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.role is distinct from new.role and not public.is_owner() then
    raise exception 'Only owner can change user roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function public.touch_updated_at();

drop trigger if exists profiles_prevent_role_escalation on public.profiles;
create trigger profiles_prevent_role_escalation before update on public.profiles
for each row execute function public.prevent_role_escalation();

drop trigger if exists products_touch_updated_at on public.products;
create trigger products_touch_updated_at before update on public.products
for each row execute function public.touch_updated_at();

drop trigger if exists customers_touch_updated_at on public.customers;
create trigger customers_touch_updated_at before update on public.customers
for each row execute function public.touch_updated_at();

drop trigger if exists orders_touch_updated_at on public.orders;
create trigger orders_touch_updated_at before update on public.orders
for each row execute function public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.chat_sessions enable row level security;
alter table public.chat_messages enable row level security;
alter table public.chat_summaries enable row level security;
alter table public.admin_action_logs enable row level security;
alter table public.rate_limits enable row level security;
alter table public.abuse_logs enable row level security;

drop policy if exists "profiles own read" on public.profiles;
create policy "profiles own read" on public.profiles for select
using (id = auth.uid() or public.is_admin_or_owner());

drop policy if exists "profiles own update safe fields" on public.profiles;
create policy "profiles own update safe fields" on public.profiles for update
using (id = auth.uid() or public.is_owner())
with check (id = auth.uid() or public.is_owner());

drop policy if exists "products public visible read" on public.products;
create policy "products public visible read" on public.products for select
using ((active = true and visible = true) or public.is_admin_or_owner());

drop policy if exists "products admin insert" on public.products;
create policy "products admin insert" on public.products for insert
with check (public.is_admin_or_owner());

drop policy if exists "products admin update" on public.products;
create policy "products admin update" on public.products for update
using (public.is_admin_or_owner())
with check (public.is_admin_or_owner());

drop policy if exists "products owner delete" on public.products;
create policy "products owner delete" on public.products for delete
using (public.is_owner());

drop policy if exists "customers own or staff read" on public.customers;
create policy "customers own or staff read" on public.customers for select
using (profile_id = auth.uid() or public.is_admin_or_owner());

drop policy if exists "customers own insert" on public.customers;
create policy "customers own insert" on public.customers for insert
with check (profile_id = auth.uid() or auth.uid() is null);

drop policy if exists "customers own update" on public.customers;
create policy "customers own update" on public.customers for update
using (profile_id = auth.uid() or public.is_admin_or_owner())
with check (profile_id = auth.uid() or public.is_admin_or_owner());

drop policy if exists "orders own or staff read" on public.orders;
create policy "orders own or staff read" on public.orders for select
using (profile_id = auth.uid() or public.is_admin_or_owner());

drop policy if exists "orders customer insert" on public.orders;
create policy "orders customer insert" on public.orders for insert
with check (profile_id = auth.uid() or auth.uid() is null);

drop policy if exists "orders staff update" on public.orders;
create policy "orders staff update" on public.orders for update
using (public.is_admin_or_owner())
with check (public.is_admin_or_owner());

drop policy if exists "chat sessions own or staff read" on public.chat_sessions;
create policy "chat sessions own or staff read" on public.chat_sessions for select
using (profile_id = auth.uid() or public.is_admin_or_owner());

drop policy if exists "chat sessions customer insert" on public.chat_sessions;
create policy "chat sessions customer insert" on public.chat_sessions for insert
with check (profile_id = auth.uid() or auth.uid() is null);

drop policy if exists "chat messages session owner or staff read" on public.chat_messages;
create policy "chat messages session owner or staff read" on public.chat_messages for select
using (
  public.is_admin_or_owner()
  or exists (
    select 1 from public.chat_sessions s
    where s.id = chat_messages.session_id and s.profile_id = auth.uid()
  )
);

drop policy if exists "chat messages customer insert" on public.chat_messages;
create policy "chat messages customer insert" on public.chat_messages for insert
with check (
  public.is_admin_or_owner()
  or exists (
    select 1 from public.chat_sessions s
    where s.id = chat_messages.session_id and s.profile_id = auth.uid()
  )
);

drop policy if exists "chat summaries owner or staff read" on public.chat_summaries;
create policy "chat summaries owner or staff read" on public.chat_summaries for select
using (
  public.is_admin_or_owner()
  or exists (
    select 1 from public.chat_sessions s
    where s.id = chat_summaries.session_id and s.profile_id = auth.uid()
  )
);

drop policy if exists "chat summaries staff write" on public.chat_summaries;
create policy "chat summaries staff write" on public.chat_summaries for all
using (public.is_admin_or_owner())
with check (public.is_admin_or_owner());

drop policy if exists "admin logs staff read" on public.admin_action_logs;
create policy "admin logs staff read" on public.admin_action_logs for select
using (public.is_admin_or_owner());

drop policy if exists "admin logs staff insert" on public.admin_action_logs;
create policy "admin logs staff insert" on public.admin_action_logs for insert
with check (public.is_admin_or_owner());

drop policy if exists "rate limits server only no public read" on public.rate_limits;
create policy "rate limits server only no public read" on public.rate_limits for select
using (false);

drop policy if exists "abuse logs staff read" on public.abuse_logs;
create policy "abuse logs staff read" on public.abuse_logs for select
using (public.is_admin_or_owner());

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('payment-slips', 'payment-slips', false)
on conflict (id) do update set public = false;

drop policy if exists "product images public read" on storage.objects;
create policy "product images public read" on storage.objects for select
using (bucket_id = 'product-images');

drop policy if exists "product images staff write" on storage.objects;
create policy "product images staff write" on storage.objects for insert
with check (bucket_id = 'product-images' and public.is_admin_or_owner());

drop policy if exists "payment slips owner upload" on storage.objects;
create policy "payment slips owner upload" on storage.objects for insert
with check (
  bucket_id = 'payment-slips'
  and auth.uid() is not null
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "payment slips owner or staff read" on storage.objects;
create policy "payment slips owner or staff read" on storage.objects for select
using (
  bucket_id = 'payment-slips'
  and (
    public.is_admin_or_owner()
    or ((storage.foldername(name))[1] = auth.uid()::text)
  )
);
