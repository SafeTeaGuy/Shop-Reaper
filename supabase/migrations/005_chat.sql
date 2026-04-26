-- ─────────────────────────────────────────────────────────────────────────────
-- 005_chat.sql  —  Affiliate & Seller Community Chat
-- ─────────────────────────────────────────────────────────────────────────────

-- Chat groups (channels)
CREATE TABLE public.chat_groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug        TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL,
  description TEXT,
  icon        TEXT NOT NULL DEFAULT '💬',
  is_public   BOOLEAN NOT NULL DEFAULT true,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat_groups_read" ON public.chat_groups FOR SELECT USING (true);

-- Chat messages
CREATE TABLE public.chat_messages (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id     UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,   -- shop name or tiktok handle at time of post
  avatar_seed  TEXT,            -- for deterministic avatar generation
  body         TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 2000),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read messages in public groups
CREATE POLICY "chat_messages_read" ON public.chat_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.chat_groups g
      WHERE g.id = group_id AND g.is_public = true
    )
  );

-- Authenticated users can post (one message per user per group enforced at app level)
CREATE POLICY "chat_messages_insert" ON public.chat_messages
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can delete their own messages
CREATE POLICY "chat_messages_delete" ON public.chat_messages
  FOR DELETE USING (auth.uid() = user_id);

-- Index for fast per-group message fetches
CREATE INDEX chat_messages_group_created ON public.chat_messages (group_id, created_at DESC);

-- Enable Supabase Realtime on chat_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- ── Seed default groups ─────────────────────────────────────────────────────
INSERT INTO public.chat_groups (slug, name, description, icon, sort_order) VALUES
  ('general',        'General',           'Open discussion for all Shop Reaper sellers',                        '💬', 0),
  ('affiliates',     'Affiliates',        'Connect with creators and negotiate commission deals',               '🤝', 1),
  ('co-op-pool',     'Co-op Pool',        'Coordinate on pool deals, sourcing tips, AliExpress finds',         '🏊', 2),
  ('beauty',         'Beauty & Skincare', 'Beauty, skincare, and wellness niche community',                    '💄', 3),
  ('electronics',    'Electronics',       'Gadgets, accessories, and electronics sellers',                     '📱', 4),
  ('product-ideas',  'Product Ideas',     'Propose products, share winning niches, validate before buying',    '💡', 5);
