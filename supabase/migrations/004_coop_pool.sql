-- ─────────────────────────────────────────────
-- MIGRATION 004 — Reaper Co-op Pool
-- Group inventory purchasing powered by pooled revenue contributions
-- ─────────────────────────────────────────────

-- Pool deals (curated by admin/AI or proposed by sellers)
CREATE TABLE IF NOT EXISTS public.pool_deals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title          TEXT NOT NULL,
  description    TEXT,
  aliexpress_url TEXT NOT NULL,
  image_url      TEXT,
  unit_price     NUMERIC(10,2) NOT NULL,
  min_units      INTEGER NOT NULL,
  target_amount  NUMERIC(12,2) NOT NULL, -- unit_price × min_units
  category       TEXT,
  proposed_by    UUID REFERENCES public.users(id) ON DELETE SET NULL, -- NULL = admin
  status         TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft','open','funded','ordered','delivered','cancelled')),
  ai_match_tags  TEXT[] NOT NULL DEFAULT '{}',
  funded_at      TIMESTAMPTZ,
  ordered_at     TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pool_deals ENABLE ROW LEVEL SECURITY;
-- Anyone authenticated can read open deals
CREATE POLICY "pool_deals_read" ON public.pool_deals FOR SELECT
  USING (status != 'draft' OR auth.uid() = proposed_by);
-- Sellers can propose (insert) deals attributed to themselves
CREATE POLICY "pool_deals_propose" ON public.pool_deals FOR INSERT
  WITH CHECK (auth.uid() = proposed_by);

CREATE INDEX IF NOT EXISTS pool_deals_status_idx ON public.pool_deals(status);

-- ── MEMBERSHIPS ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.pool_memberships (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_deal_id             UUID NOT NULL REFERENCES public.pool_deals(id) ON DELETE CASCADE,
  user_id                  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shop_id                  UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  contribution_pct         NUMERIC(4,2) NOT NULL
    CHECK (contribution_pct > 0 AND contribution_pct <= 20),
  stripe_payment_method_id TEXT,
  is_active                BOOLEAN NOT NULL DEFAULT true,
  joined_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at                  TIMESTAMPTZ,
  UNIQUE(pool_deal_id, user_id)
);

ALTER TABLE public.pool_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "memberships_owner" ON public.pool_memberships FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS memberships_deal_idx   ON public.pool_memberships(pool_deal_id);
CREATE INDEX IF NOT EXISTS memberships_user_idx   ON public.pool_memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_active_idx ON public.pool_memberships(pool_deal_id, is_active);

-- ── CONTRIBUTION LEDGER ──────────────────────
CREATE TABLE IF NOT EXISTS public.pool_contributions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_deal_id     UUID NOT NULL REFERENCES public.pool_deals(id) ON DELETE CASCADE,
  membership_id    UUID NOT NULL REFERENCES public.pool_memberships(id) ON DELETE CASCADE,
  user_id          UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  amount           NUMERIC(10,2) NOT NULL,
  revenue_basis    NUMERIC(12,2) NOT NULL, -- revenue_30d at billing time
  period           DATE NOT NULL,           -- first day of billing month
  stripe_charge_id TEXT,
  status           TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','collected','failed','refunded')),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(membership_id, period)
);

ALTER TABLE public.pool_contributions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "contributions_read" ON public.pool_contributions FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS contributions_deal_idx  ON public.pool_contributions(pool_deal_id);
CREATE INDEX IF NOT EXISTS contributions_user_idx  ON public.pool_contributions(user_id);
CREATE INDEX IF NOT EXISTS contributions_charge_idx ON public.pool_contributions(stripe_charge_id);

-- ── ORDERS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pool_orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_deal_id         UUID NOT NULL REFERENCES public.pool_deals(id) ON DELETE CASCADE,
  total_collected      NUMERIC(12,2) NOT NULL,
  unit_count           INTEGER NOT NULL,
  aliexpress_order_ref TEXT,
  status               TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','placed','shipped','delivered')),
  placed_at            TIMESTAMPTZ,
  notes                TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.pool_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "pool_orders_read" ON public.pool_orders FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS pool_orders_deal_idx ON public.pool_orders(pool_deal_id);
