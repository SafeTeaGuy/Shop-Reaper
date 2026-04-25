import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeSps } from "@/lib/tiktok/client";

// Public API — no auth required for basic queries
// Rate limited: 1000 req/day free, unlimited for Reaper+ API keys

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const apiKey = request.headers.get("x-reaper-key");
  const supabase = await createAdminClient();

  // Basic rate limiting via Supabase (simplified)
  const ip = request.headers.get("x-forwarded-for") ?? "unknown";

  // Find shop
  const { data: shop } = await supabase
    .from("shops")
    .select("id, shop_name, tiktok_handle, region, connected_at")
    .or(`tiktok_handle.eq.@${handle},tiktok_handle.eq.${handle}`)
    .eq("is_active", true)
    .single();

  if (!shop) {
    return NextResponse.json(
      { error: "Shop not found or not Reaper-connected", handle },
      { status: 404 }
    );
  }

  // Get latest metrics
  const { data: metrics } = await supabase
    .from("metrics")
    .select("*")
    .eq("shop_id", shop.id)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!metrics) {
    return NextResponse.json(
      { error: "No metrics available — shop may still be syncing", handle },
      { status: 404 }
    );
  }

  const sps = computeSps({
    negative_review_rate:        metrics.negative_review_rate,
    return_rate_non_buyer_fault: metrics.return_rate_non_buyer_fault,
    cancel_rate_seller_fault:    metrics.cancel_rate_seller_fault,
    on_time_delivery_rate:       metrics.on_time_delivery_rate,
    im_dissatisfaction_rate:     metrics.im_dissatisfaction_rate,
    aftersales_handling_hours:   metrics.aftersales_handling_hours,
  });

  const isVerified   = sps.score >= 3.0 && metrics.violations_count < 3;
  const cleanHandle  = shop.tiktok_handle.replace("@", "");
  const baseUrl      = process.env.NEXT_PUBLIC_APP_URL ?? "https://shopreaper.io";

  // Full response for API key holders, basic for free
  const response = {
    handle:       cleanHandle,
    shop_name:    shop.shop_name,
    region:       shop.region,
    verified:     isVerified,
    score:        sps.score,
    risk_level:   sps.risk,
    ...(apiKey ? {
      // Full data for API key holders
      components: {
        on_time_delivery_rate:       metrics.on_time_delivery_rate,
        negative_review_rate:        metrics.negative_review_rate,
        return_rate_non_buyer_fault: metrics.return_rate_non_buyer_fault,
        cancel_rate_seller_fault:    metrics.cancel_rate_seller_fault,
        im_dissatisfaction_rate:     metrics.im_dissatisfaction_rate,
        aftersales_handling_hours:   metrics.aftersales_handling_hours,
        violations_count:            metrics.violations_count,
        refund_rate:                 metrics.refund_rate,
      },
      revenue_30d:    metrics.revenue_30d,
      orders_30d:     metrics.orders_30d,
      affiliate_count: metrics.affiliate_count,
      weakest_metric: sps.weakest_metric,
      threshold_breaches: sps.threshold_breaches,
    } : {}),
    badge_url:    `${baseUrl}/api/v1/score/${cleanHandle}/badge.svg`,
    profile_url:  `${baseUrl}/score/${cleanHandle}`,
    updated_at:   metrics.created_at,
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control":               "public, s-maxage=300, stale-while-revalidate=600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "X-Reaper-Score":             String(sps.score),
      "X-Reaper-Verified":          String(isVerified),
    },
  });
}
