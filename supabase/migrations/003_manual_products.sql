-- ─────────────────────────────────────────────
-- MIGRATION 003 — Manual Products + Shop Health
-- Allows sellers to add products manually (AliExpress,
-- dropshipping, etc.) without a TikTok sync.
-- ─────────────────────────────────────────────

-- Add source tracking to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'tiktok'
    CHECK (source IN ('tiktok', 'manual', 'aliexpress'));

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Allow null tiktok_sku_id for manually added products
ALTER TABLE public.products
  ALTER COLUMN tiktok_sku_id DROP NOT NULL;

-- Replace the blanket unique constraint with a partial one
-- (only enforced for TikTok-synced products)
ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_shop_id_tiktok_sku_id_key;

CREATE UNIQUE INDEX IF NOT EXISTS products_tiktok_sku_unique
  ON public.products(shop_id, tiktok_sku_id)
  WHERE tiktok_sku_id IS NOT NULL;

-- ── MANUAL SHOP HEALTH ───────────────────────
-- Lets sellers enter their own SPS/OTD/refund when
-- TikTok is not connected or metrics haven't synced yet.
CREATE TABLE IF NOT EXISTS public.manual_shop_health (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id               UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  sps_computed          NUMERIC(4,2) NOT NULL DEFAULT 0
    CHECK (sps_computed >= 0 AND sps_computed <= 5),
  on_time_delivery_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  refund_rate           NUMERIC(5,2) NOT NULL DEFAULT 0,
  revenue_30d           NUMERIC(12,2) NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(shop_id)
);

ALTER TABLE public.manual_shop_health ENABLE ROW LEVEL SECURITY;

CREATE POLICY "manual_health_owner" ON public.manual_shop_health FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = shop_id AND s.user_id = auth.uid()
  ));

CREATE INDEX IF NOT EXISTS manual_health_shop_idx
  ON public.manual_shop_health(shop_id);
