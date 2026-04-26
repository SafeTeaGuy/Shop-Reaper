-- ── PUSH SUBSCRIPTIONS ──────────────────────
create table if not exists public.push_subscriptions (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references public.users(id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  updated_at  timestamptz not null default now(),
  unique(user_id, endpoint)
);
alter table public.push_subscriptions enable row level security;
create policy "push_owner" on public.push_subscriptions for all using (auth.uid() = user_id);

-- ── WEEKLY REPORTS ────────────────────────────
create table if not exists public.weekly_reports (
  id           uuid primary key default uuid_generate_v4(),
  shop_id      uuid not null references public.shops(id) on delete cascade,
  report_json  jsonb not null,
  generated_at timestamptz not null default now()
);
alter table public.weekly_reports enable row level security;
create policy "reports_owner" on public.weekly_reports for all
  using (exists (select 1 from public.shops s where s.id = shop_id and s.user_id = auth.uid()));

create index if not exists reports_shop_date on public.weekly_reports(shop_id, generated_at desc);

-- ── VAPID KEY STORAGE (add to users) ─────────
alter table public.users add column if not exists vapid_sub jsonb;
