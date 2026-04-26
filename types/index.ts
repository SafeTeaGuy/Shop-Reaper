// ─────────────────────────────────────────────
// SHOP REAPER — Core Types
// ─────────────────────────────────────────────

export type PlanTier = "basic" | "reaper" | "agency";
export type AlertSeverity = "critical" | "warning" | "info";
export type AlertType =
  | "sps_drift"
  | "delivery_floor"
  | "refund_spike"
  | "affiliate_throttle"
  | "violation_count"
  | "sku_death"
  | "commission_change"
  | "policy_change";
export type SkuStatus = "dying" | "warning" | "monitor" | "hero";
export type ShopRisk = "safe" | "warning" | "critical" | "restricted";

// ── USER ──────────────────────────────────────
export interface User {
  id: string;
  email: string;
  plan_tier: PlanTier;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  referral_code: string | null;       // e.g. "CASHKING"
  referred_by: string | null;
  sms_phone: string | null;
  sms_enabled: boolean;
  created_at: string;
}

// ── SHOP ─────────────────────────────────────
export interface Shop {
  id: string;
  user_id: string;
  tiktok_shop_id: string;
  tiktok_handle: string;
  shop_name: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  region: string;
  connected_at: string;
  last_synced_at: string | null;
  is_active: boolean;
}

// ── METRICS ──────────────────────────────────
export interface ShopMetrics {
  id: string;
  shop_id: string;
  date: string;

  // SPS components (computed from API)
  negative_review_rate: number;       // %  target < 2
  return_rate_non_buyer_fault: number;// %  target < 5
  cancel_rate_seller_fault: number;   // %  target < 1
  on_time_delivery_rate: number;      // %  target > 85
  im_dissatisfaction_rate: number;    // %  target < 10
  aftersales_handling_hours: number;  // hrs target < 48

  // Computed
  sps_computed: number;               // 0-5 weighted score
  ahr: number;                        // 0-100
  risk_level: ShopRisk;

  // Operational
  violations_count: number;
  revenue_30d: number;
  orders_30d: number;
  pending_orders: number;
  refund_rate: number;                // %
  affiliate_count: number;

  raw_json: Record<string, unknown>;
  created_at: string;
}

export type ProductSource = "tiktok" | "manual" | "aliexpress";

// ── PRODUCTS / SKUS ───────────────────────────
export interface Product {
  id: string;
  shop_id: string;
  tiktok_sku_id: string | null;
  name: string;
  image_url: string | null;
  price: number;
  status: SkuStatus;
  cvr_7d: number;
  cvr_30d: number;
  revenue_30d: number;
  orders_30d: number;
  refund_count_30d: number;
  impressions_30d: number;
  affiliate_traffic_share: number;    // % of total affiliate traffic
  source: ProductSource;
  source_url: string | null;
  last_updated: string;
}

// ── MANUAL SHOP HEALTH ────────────────────────
export interface ManualShopHealth {
  id: string;
  shop_id: string;
  sps_computed: number;
  on_time_delivery_rate: number;
  refund_rate: number;
  revenue_30d: number;
  updated_at: string;
}

// ── ALERTS ────────────────────────────────────
export interface Alert {
  id: string;
  shop_id: string;
  alert_type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  fix_script: string;
  policy_ref: string | null;
  revenue_at_risk: number | null;
  metric_value: number | null;
  metric_threshold: number | null;
  sent_sms: boolean;
  sent_email: boolean;
  actioned_at: string | null;
  dismissed_at: string | null;
  created_at: string;
}

// ── REAPER COACH ─────────────────────────────
export interface CoachMessage {
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

export interface CoachSession {
  id: string;
  shop_id: string;
  messages: CoachMessage[];
  created_at: string;
}

// ── AFFILIATE ─────────────────────────────────
export interface Affiliate {
  id: string;
  shop_id: string;
  creator_handle: string;
  commission_rate: number;
  status: "active" | "at_risk" | "churned";
  last_sale_at: string | null;
  total_revenue_attributed: number;
}

// ── REFERRAL / CASH KING ─────────────────────
export interface Referral {
  id: string;
  referrer_code: string;             // "CASHKING"
  referred_user_id: string;
  plan_tier: PlanTier;
  mrr: number;
  commission_pct: number;            // 20
  commission_amount: number;
  status: "active" | "churned";
  created_at: string;
}

// ── API RESPONSES ─────────────────────────────
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

export interface TikTokApiResponse<T> {
  code: number;
  message: string;
  data: T;
  request_id: string;
}

// ── SPS COMPUTATION ───────────────────────────
export interface SpsComponents {
  negative_review_rate: number;
  return_rate_non_buyer_fault: number;
  cancel_rate_seller_fault: number;
  on_time_delivery_rate: number;
  im_dissatisfaction_rate: number;
  aftersales_handling_hours: number;
}

export interface SpsResult {
  score: number;           // 0-5
  risk: ShopRisk;
  components: SpsComponents;
  weakest_metric: keyof SpsComponents;
  threshold_breaches: string[];
}

// ── DASHBOARD STATE ───────────────────────────
export interface DashboardData {
  shop: Shop;
  metrics: ShopMetrics;
  sps: SpsResult;
  alerts: Alert[];
  products: Product[];
  affiliates: Affiliate[];
}

// ── STRIPE ───────────────────────────────────
export const PLAN_PRICES: Record<PlanTier, { priceId: string; amount: number; label: string }> = {
  basic:  { priceId: process.env.STRIPE_BASIC_PRICE_ID  ?? "", amount: 19, label: "Basic"  },
  reaper: { priceId: process.env.STRIPE_REAPER_PRICE_ID ?? "", amount: 49, label: "Reaper" },
  agency: { priceId: process.env.STRIPE_AGENCY_PRICE_ID ?? "", amount: 99, label: "Agency" },
};
