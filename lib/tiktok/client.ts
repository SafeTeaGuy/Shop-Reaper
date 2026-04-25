import crypto from "crypto";
import type {
  SpsComponents, SpsResult, ShopRisk,
  TikTokApiResponse
} from "@/types";

const BASE_URL = "https://open-api.tiktokglobalshop.com";
const APP_KEY = process.env.TIKTOK_APP_KEY!;
const APP_SECRET = process.env.TIKTOK_APP_SECRET!;

// ─────────────────────────────────────────────
// REQUEST SIGNING (HMAC-SHA256)
// TikTok Partner API v2 requires every request signed
// ─────────────────────────────────────────────
function signRequest(
  path: string,
  params: Record<string, string>,
  body: string,
  timestamp: number
): string {
  // Sort params alphabetically, concat key+value
  const sortedParams = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "access_token")
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");

  const stringToSign = `${APP_SECRET}${path}${sortedParams}${body}${APP_SECRET}`;
  return crypto
    .createHmac("sha256", APP_SECRET)
    .update(stringToSign)
    .digest("hex");
}

function buildSignedUrl(
  path: string,
  params: Record<string, string> = {},
  body = "",
  accessToken?: string
): string {
  const timestamp = Math.floor(Date.now() / 1000);

  const baseParams: Record<string, string> = {
    app_key: APP_KEY,
    timestamp: String(timestamp),
    ...params,
  };
  if (accessToken) baseParams.access_token = accessToken;

  const sign = signRequest(path, baseParams, body, timestamp);
  baseParams.sign = sign;

  const qs = new URLSearchParams(baseParams).toString();
  return `${BASE_URL}${path}?${qs}`;
}

// ─────────────────────────────────────────────
// OAUTH HELPERS
// ─────────────────────────────────────────────
export function getTikTokAuthUrl(state: string): string {
  const params = new URLSearchParams({
    app_key: APP_KEY,
    redirect_uri: process.env.TIKTOK_REDIRECT_URI!,
    state,
    // All required scopes
    scope: [
      "seller.shop.read",
      "order.read",
      "product.read",
      "finance.read",
      "logistics.read",
      "aftersale.read",
      "customer_service.read",
    ].join(","),
  });
  return `https://auth.tiktok-shops.com/oauth/authorize?${params}`;
}

export async function exchangeCodeForToken(code: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  seller_id: string;
  seller_name: string;
}> {
  const path = "/api/token/createAccessToken";
  const body = JSON.stringify({ auth_code: code, grant_type: "authorized_code" });
  const url = buildSignedUrl(path, {}, body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-tts-access-token": "" },
    body,
  });

  const json: TikTokApiResponse<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    refresh_expires_in: number;
    seller_id: string;
    seller_name: string;
  }> = await res.json();

  if (json.code !== 0) throw new Error(`TikTok OAuth error: ${json.message}`);
  return json.data;
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  access_token: string;
  refresh_token: string;
  expires_in: number;
}> {
  const path = "/api/token/refreshToken";
  const body = JSON.stringify({ refresh_token: refreshToken, grant_type: "refresh_token" });
  const url = buildSignedUrl(path, {}, body);

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
  const json: TikTokApiResponse<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }> = await res.json();

  if (json.code !== 0) throw new Error(`TikTok token refresh error: ${json.message}`);
  return json.data;
}

// ─────────────────────────────────────────────
// TIKTOK API CLASS
// ─────────────────────────────────────────────
export class TikTokShopClient {
  private accessToken: string;
  private shopId: string;

  constructor(accessToken: string, shopId: string) {
    this.accessToken = accessToken;
    this.shopId = shopId;
  }

  private async get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
    const url = buildSignedUrl(
      path,
      { ...params, shop_id: this.shopId },
      "",
      this.accessToken
    );
    const res = await fetch(url, {
      headers: {
        "x-tts-access-token": this.accessToken,
        "Content-Type": "application/json",
      },
      next: { revalidate: 0 },
    });
    const json: TikTokApiResponse<T> = await res.json();
    if (json.code !== 0) throw new Error(`TikTok API error ${json.code}: ${json.message}`);
    return json.data;
  }

  private async post<T>(path: string, body: Record<string, unknown>, params: Record<string, string> = {}): Promise<T> {
    const bodyStr = JSON.stringify(body);
    const url = buildSignedUrl(
      path,
      { ...params, shop_id: this.shopId },
      bodyStr,
      this.accessToken
    );
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-tts-access-token": this.accessToken,
        "Content-Type": "application/json",
      },
      body: bodyStr,
    });
    const json: TikTokApiResponse<T> = await res.json();
    if (json.code !== 0) throw new Error(`TikTok API error ${json.code}: ${json.message}`);
    return json.data;
  }

  // ── SHOP INFO ────────────────────────────
  async getShopInfo() {
    return this.get<{
      shop_id: string;
      shop_name: string;
      region: string;
      shop_status: string;
    }>("/api/shop/get");
  }

  // ── ORDERS ───────────────────────────────
  async getOrders(pageSize = 100, cursor?: string) {
    return this.get<{
      orders: Array<{
        id: string;
        status: string;
        cancel_reason?: string;
        create_time: number;
        update_time: number;
        buyer_uid: string;
        shipping_type: string;
      }>;
      next_cursor?: string;
      total_count: number;
    }>("/api/orders/search", {
      page_size: String(pageSize),
      ...(cursor ? { cursor } : {}),
      sort_field: "CREATE_TIME",
      sort_order: "DESC",
    });
  }

  // ── FULFILLMENT METRICS ───────────────────
  async getShopPerformance(startDate: string, endDate: string) {
    return this.get<{
      on_time_delivery_rate: number;
      negative_review_rate: number;
      seller_fault_cancel_rate: number;
      refund_rate: number;
      im_satisfaction_rate: number;
    }>("/api/seller/shop/performance", {
      start_date: startDate,
      end_date: endDate,
    });
  }

  // ── RETURNS ──────────────────────────────
  async getReturns(pageSize = 100) {
    return this.get<{
      returns: Array<{
        id: string;
        reason: string;
        fault_type: string; // "BUYER_FAULT" | "SELLER_FAULT" | "PLATFORM_FAULT"
        status: string;
        create_time: number;
        refund_amount: string;
      }>;
      total_count: number;
    }>("/api/reverse/order/list", {
      page_size: String(pageSize),
    });
  }

  // ── PRODUCTS ─────────────────────────────
  async getProducts(pageSize = 100, pageToken?: string) {
    return this.get<{
      products: Array<{
        id: string;
        title: string;
        status: string;
        main_images: Array<{ url_list: string[] }>;
        skus: Array<{
          id: string;
          seller_sku: string;
          price: { original_price: string; currency: string };
          inventory: Array<{ quantity: number }>;
        }>;
      }>;
      next_page_token?: string;
      total_count: number;
    }>("/api/products/search", {
      page_size: String(pageSize),
      ...(pageToken ? { page_token: pageToken } : {}),
    });
  }

  // ── PRODUCT ANALYTICS ────────────────────
  async getProductAnalytics(productIds: string[], startDate: string, endDate: string) {
    return this.post<{
      product_analytics: Array<{
        product_id: string;
        impression: number;
        click: number;
        add_to_cart: number;
        order_count: number;
        revenue: string;
        refund_count: number;
        conversion_rate: number;
      }>;
    }>("/api/product/analytics", {
      product_ids: productIds,
      start_date: startDate,
      end_date: endDate,
    });
  }

  // ── FINANCE ──────────────────────────────
  async getSettlements(startTime: number, endTime: number) {
    return this.get<{
      settlements: Array<{
        settlement_id: string;
        amount: string;
        currency: string;
        settlement_time: number;
        status: string;
      }>;
    }>("/api/finance/settlements/search", {
      start_timestamp: String(startTime),
      end_timestamp: String(endTime),
    });
  }

  // ── VIOLATIONS ───────────────────────────
  async getViolations() {
    return this.get<{
      violations: Array<{
        violation_id: string;
        type: string;
        description: string;
        status: string;
        create_time: number;
      }>;
      total_count: number;
    }>("/api/shop/violations");
  }

  // ── AFTERSALES ───────────────────────────
  async getAftersales(pageSize = 100) {
    return this.get<{
      aftersales: Array<{
        id: string;
        type: string;
        status: string;
        create_time: number;
        update_time: number;
        handling_duration_hours: number;
      }>;
      total_count: number;
    }>("/api/aftersale/list", {
      page_size: String(pageSize),
    });
  }
}

// ─────────────────────────────────────────────
// SPS COMPUTATION ENGINE
// Weighted composite from 6 TikTok sub-metrics
// ─────────────────────────────────────────────
const SPS_WEIGHTS = {
  negative_review_rate:        0.25,
  return_rate_non_buyer_fault: 0.20,
  cancel_rate_seller_fault:    0.20,
  on_time_delivery_rate:       0.20,
  im_dissatisfaction_rate:     0.08,
  aftersales_handling_hours:   0.07,
};

const SPS_THRESHOLDS = {
  negative_review_rate:        { max: 2,  ideal: 0   },  // lower is better
  return_rate_non_buyer_fault: { max: 5,  ideal: 0   },
  cancel_rate_seller_fault:    { max: 1,  ideal: 0   },
  on_time_delivery_rate:       { min: 85, ideal: 100 },   // higher is better
  im_dissatisfaction_rate:     { max: 10, ideal: 0   },
  aftersales_handling_hours:   { max: 48, ideal: 0   },
};

export function computeSps(components: SpsComponents): SpsResult {
  let score = 0;
  const breaches: string[] = [];

  // Normalise each metric to 0-1 (1 = perfect)
  const normalized: Record<keyof SpsComponents, number> = {} as Record<keyof SpsComponents, number>;

  // Lower-is-better metrics
  (["negative_review_rate","return_rate_non_buyer_fault","cancel_rate_seller_fault","im_dissatisfaction_rate","aftersales_handling_hours"] as const).forEach((key) => {
    const thresh = SPS_THRESHOLDS[key] as { max: number; ideal: number };
    const val = components[key];
    normalized[key] = Math.max(0, 1 - val / thresh.max);
    if (key === "aftersales_handling_hours" ? val > thresh.max : val > thresh.max) {
      breaches.push(key);
    }
  });

  // Higher-is-better
  const otd = components.on_time_delivery_rate;
  normalized.on_time_delivery_rate = Math.max(0, otd / 100);
  if (otd < 85) breaches.push("on_time_delivery_rate");

  // Weighted sum → scale to 0-5
  Object.entries(SPS_WEIGHTS).forEach(([key, weight]) => {
    score += normalized[key as keyof SpsComponents] * weight * 5;
  });
  score = Math.min(5, Math.max(0, parseFloat(score.toFixed(2))));

  // Risk classification
  let risk: ShopRisk = "safe";
  if (score < 2.5) risk = "restricted";
  else if (score < 3.0) risk = "critical";
  else if (score < 3.5) risk = "warning";

  // Find weakest metric
  const weakest = Object.entries(normalized).reduce((a, b) =>
    b[1] < a[1] ? b : a
  )[0] as keyof SpsComponents;

  return { score, risk, components, weakest_metric: weakest, threshold_breaches: breaches };
}
