-- ─────────────────────────────────────────────
-- SHOP REAPER — Database Schema
-- Run in Supabase SQL editor or via CLI
-- ─────────────────────────────────────────────

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ── USERS ────────────────────────────────────
create table if not exists public.users (
  id                    uuid references auth.users(id) on delete cascade primary key,
  email                 text not null,
  plan_tier             text not null default 'basic' check (plan_tier in ('basic','reaper','agency')),
  stripe_customer_id    text,
  stripe_subscription_id text,
  referral_code         text,
  referred_by           text,
  sms_phone             text,
  sms_enabled           boolean not null default false,
  created_at            timestamptz not null default now()
);

alter table public.users enable row level security;
create policy "users_own" on public.users for all using (auth.uid() = id);

-- Auto-create user row on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, email, referred_by)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'referral_code'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── SHOPS ────────────────────────────────────
create table if not exists public.shops (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references public.users(id) on delete cascade,
  tiktok_shop_id    text not null unique,
  tiktok_handle     text not null,
  shop_name         text not null,
  access_token      text not null,
  refresh_token     text not null,
  token_expires_at  timestamptz not null,
  region            text not null default 'US',
  connected_at      timestamptz not null default now(),
  last_synced_at    timestamptz,
  is_active         boolean not null default true
);

alter table public.shops enable row level security;
create policy "shops_owner" on public.shops for all
  using (auth.uid() = user_id);

create index if not exists shops_user_id_idx on public.shops(user_id);
create index if not exists shops_tiktok_id_idx on public.shops(tiktok_shop_id);

-- ── METRICS ──────────────────────────────────
create table if not exists public.metrics (
  id                              uuid primary key default uuid_generate_v4(),
  shop_id                         uuid not null references public.shops(id) on delete cascade,
  date                            date not null,
  negative_review_rate            numeric(5,2) not null default 0,
  return_rate_non_buyer_fault     numeric(5,2) not null default 0,
  cancel_rate_seller_fault        numeric(5,2) not null default 0,
  on_time_delivery_rate           numeric(5,2) not null default 0,
  im_dissatisfaction_rate         numeric(5,2) not null default 0,
  aftersales_handling_hours       numeric(6,1) not null default 0,
  sps_computed                    numeric(4,2) not null default 0,
  ahr                             integer not null default 0,
  risk_level                      text not null default 'safe'
    check (risk_level in ('safe','warning','critical','restricted')),
  violations_count                integer not null default 0,
  revenue_30d                     numeric(12,2) not null default 0,
  orders_30d                      integer not null default 0,
  pending_orders                  integer not null default 0,
  refund_rate                     numeric(5,2) not null default 0,
  affiliate_count                 integer not null default 0,
  raw_json                        jsonb,
  created_at                      timestamptz not null default now(),
  unique(shop_id, date)
);

alter table public.metrics enable row level security;
create policy "metrics_owner" on public.metrics for all
  using (exists (
    select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid()
  ));

create index if not exists metrics_shop_date_idx on public.metrics(shop_id, date desc);

-- ── PRODUCTS ─────────────────────────────────
create table if not exists public.products (
  id                      uuid primary key default uuid_generate_v4(),
  shop_id                 uuid not null references public.shops(id) on delete cascade,
  tiktok_sku_id           text not null,
  name                    text not null,
  image_url               text,
  price                   numeric(10,2) not null default 0,
  status                  text not null default 'monitor'
    check (status in ('dying','warning','monitor','hero')),
  cvr_7d                  numeric(5,2) not null default 0,
  cvr_30d                 numeric(5,2) not null default 0,
  revenue_30d             numeric(12,2) not null default 0,
  orders_30d              integer not null default 0,
  refund_count_30d        integer not null default 0,
  impressions_30d         integer not null default 0,
  affiliate_traffic_share numeric(5,2) not null default 0,
  last_updated            timestamptz not null default now(),
  unique(shop_id, tiktok_sku_id)
);

alter table public.products enable row level security;
create policy "products_owner" on public.products for all
  using (exists (
    select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid()
  ));

create index if not exists products_shop_idx on public.products(shop_id);
create index if not exists products_status_idx on public.products(shop_id, status);

-- ── ALERTS ───────────────────────────────────
create table if not exists public.alerts_log (
  id                uuid primary key default uuid_generate_v4(),
  shop_id           uuid not null references public.shops(id) on delete cascade,
  alert_type        text not null,
  severity          text not null check (severity in ('critical','warning','info')),
  title             text not null,
  message           text not null,
  fix_script        text not null default '',
  policy_ref        text,
  revenue_at_risk   numeric(12,2),
  metric_value      numeric(10,2),
  metric_threshold  numeric(10,2),
  sent_sms          boolean not null default false,
  sent_email        boolean not null default false,
  actioned_at       timestamptz,
  dismissed_at      timestamptz,
  created_at        timestamptz not null default now()
);

alter table public.alerts_log enable row level security;
create policy "alerts_owner" on public.alerts_log for all
  using (exists (
    select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid()
  ));

create index if not exists alerts_shop_created_idx on public.alerts_log(shop_id, created_at desc);
create index if not exists alerts_severity_idx on public.alerts_log(shop_id, severity, dismissed_at);

-- ── COACH SESSIONS ────────────────────────────
create table if not exists public.coach_sessions (
  id          uuid primary key default uuid_generate_v4(),
  shop_id     uuid not null references public.shops(id) on delete cascade,
  messages    jsonb not null default '[]',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.coach_sessions enable row level security;
create policy "coach_owner" on public.coach_sessions for all
  using (exists (
    select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid()
  ));

-- ── AFFILIATES ────────────────────────────────
create table if not exists public.affiliates (
  id                          uuid primary key default uuid_generate_v4(),
  shop_id                     uuid not null references public.shops(id) on delete cascade,
  creator_handle              text not null,
  commission_rate             numeric(4,2) not null default 0,
  status                      text not null default 'active'
    check (status in ('active','at_risk','churned')),
  last_sale_at                timestamptz,
  total_revenue_attributed    numeric(12,2) not null default 0,
  unique(shop_id, creator_handle)
);

alter table public.affiliates enable row level security;
create policy "affiliates_owner" on public.affiliates for all
  using (exists (
    select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid()
  ));

-- ── REFERRALS (Cash King + partners) ─────────
create table if not exists public.referrals (
  id                  uuid primary key default uuid_generate_v4(),
  referrer_code       text not null,
  referred_user_id    uuid not null references public.users(id) on delete cascade,
  plan_tier           text not null default 'basic',
  mrr                 numeric(10,2) not null default 0,
  commission_pct      integer not null default 20,
  commission_amount   numeric(10,2) not null default 0,
  status              text not null default 'active' check (status in ('active','churned')),
  created_at          timestamptz not null default now()
);

alter table public.referrals enable row level security;
-- Admin only for referrals (service role reads all)
create policy "referrals_own" on public.referrals for select
  using (referred_user_id = auth.uid());

create index if not exists referrals_code_idx on public.referrals(referrer_code);
