# 💀 Shop Reaper

> TikTok won't warn you. We will. Brutally.

Real-time TikTok Shop intelligence agent — live SPS monitoring, brutality alerts, SKU autopsy, and AI coach powered by Claude.

---

## Stack

| Layer       | Tech                                      |
|-------------|-------------------------------------------|
| Frontend    | Next.js 15 (App Router) + Tailwind CSS    |
| Database    | Supabase (Postgres + Auth + RLS)          |
| Background  | Inngest (cron jobs + event queue)         |
| Payments    | Stripe (subscriptions + webhooks)         |
| AI Coach    | Anthropic Claude (claude-sonnet-4-6)      |
| SMS         | Twilio                                    |
| TikTok      | Shop Partner API v2 (OAuth + HMAC-SHA256) |
| Hosting     | Vercel                                    |

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/yourname/shop-reaper
cd shop-reaper
npm install
```

### 2. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in every value. See `.env.local.example` for full list with comments.

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. In SQL Editor, run `supabase/migrations/001_initial.sql`
3. Copy your project URL and anon key into `.env.local`

### 4. TikTok Shop Partner API

1. Register at [partner.tiktokshop.com](https://partner.tiktokshop.com)
2. Create a new app
3. Request these scopes:
   - `seller.shop.read`
   - `order.read`
   - `product.read`
   - `finance.read`
   - `logistics.read`
   - `aftersale.read`
   - `customer_service.read`
4. Set redirect URI to `https://yourdomain.com/api/tiktok/callback`
5. **Note:** App review takes 5–10 business days

### 5. Stripe

1. Create products + prices at [stripe.com](https://stripe.com)
   - Basic: $19/mo recurring
   - Reaper: $49/mo recurring
   - Agency: $99/mo recurring
2. Copy price IDs into `.env.local`
3. Set up webhook at `https://yourdomain.com/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`

### 6. Inngest

1. Create account at [inngest.com](https://inngest.com)
2. Copy event key + signing key into `.env.local`
3. Add your serve URL: `https://yourdomain.com/api/inngest`

### 7. Run locally

```bash
npm run dev
```

App runs at `http://localhost:3000`

For Inngest dev server (background jobs locally):
```bash
npx inngest-cli@latest dev
```

---

## Deploy to Vercel

```bash
vercel --prod
```

Set all env vars in Vercel project settings. Inngest will auto-detect the serve endpoint.

---

## Key URLs

| URL | Description |
|-----|-------------|
| `/` | Redirects to dashboard or login |
| `/login` | Magic link auth |
| `/dashboard` | Mission Control overview |
| `/dashboard/alerts` | Full alert feed |
| `/dashboard/products` | SKU Autopsy |
| `/dashboard/coach` | Reaper Coach (AI) |
| `/dashboard/settings` | SMS, billing, shops |
| `/pricing` | Pricing page |
| `/cashking` | Cash King co-branded landing |
| `/api/tiktok/connect` | Initiates TikTok OAuth |
| `/api/tiktok/callback` | OAuth callback |
| `/api/inngest` | Inngest job handler |
| `/api/stripe/webhook` | Stripe webhook |

---

## Architecture

```
TikTok Shop API
     │
     ▼
lib/tiktok/client.ts          ← Signed requests, OAuth, SPS computation
     │
     ▼
lib/inngest/jobs.ts            ← Background polling every 6hrs
     │
     ├── lib/reaper/alerts.ts  ← Alert generation engine
     │
     └── Supabase              ← metrics, alerts_log, products tables
          │
          ▼
    Dashboard (SSR)            ← app/dashboard/page.tsx
          │
          ├── SpsGauge          ← Animated arc gauge
          ├── AlertFeed         ← Expandable alerts with fix scripts
          ├── SkuTable          ← CVR-sorted SKU table
          └── ReaperCoach       ← Streaming Claude AI chat
```

---

## SPS Computation

TikTok doesn't expose SPS via API. We compute it from 6 sub-metrics:

| Metric                  | Weight | Threshold |
|------------------------|--------|-----------|
| Negative Review Rate   | 25%    | < 2%      |
| Non-Buyer Return Rate  | 20%    | < 5%      |
| Seller Cancel Rate     | 20%    | < 1%      |
| On-Time Delivery Rate  | 20%    | > 85%     |
| IM Dissatisfaction     | 8%     | < 10%     |
| After-Sales Handling   | 7%     | < 48 hrs  |

Score is normalised 0–5. Risk levels: Safe (≥3.5), Warning (3.0–3.5), Critical (2.5–3.0), Restricted (<2.5).

---

## Cash King Integration

- Landing page at `/cashking` with 14-day trial and co-founder branding
- Referral tracking via `?ref=CASHKING` query param → stored in `users.referred_by`
- 20% recurring commission tracked in `referrals` table
- Stripe webhook auto-creates referral row on subscription

---

## Roadmap

- [ ] TikTok webhook real-time events (vs polling)
- [ ] Agency white-label custom domain
- [ ] Historical SPS trend chart (Recharts)
- [ ] Affiliate directory integration
- [ ] Policy change monitoring
- [ ] EU/US commission rate tracker
- [ ] Mobile PWA push notifications
