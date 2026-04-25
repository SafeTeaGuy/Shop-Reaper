import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeSps } from "@/lib/tiktok/client";

// GET /api/v1/score/bulk?handles=shop1,shop2,shop3
// Requires X-Reaper-Key header

export async function GET(request: NextRequest) {
  const apiKey = request.headers.get("x-reaper-key");
  if (!apiKey) {
    return NextResponse.json(
      { error: "X-Reaper-Key header required for bulk endpoint. Get your key at shopreaper.io/dashboard/settings." },
      { status: 401 }
    );
  }

  const handles = request.nextUrl.searchParams.get("handles");
  if (!handles) {
    return NextResponse.json({ error: "handles query param required (comma-separated, max 20)" }, { status: 400 });
  }

  const handleList = handles.split(",").map(h => h.trim()).slice(0, 20);
  const supabase = await createAdminClient();

  // Fetch all shops matching handles
  const { data: shops } = await supabase
    .from("shops")
    .select("id, shop_name, tiktok_handle, region")
    .or(handleList.map(h => `tiktok_handle.eq.@${h}`).join(","))
    .eq("is_active", true);

  if (!shops?.length) {
    return NextResponse.json({
      results: [],
      count: 0,
      not_found: handleList,
      updated_at: new Date().toISOString(),
    });
  }

  // Get latest metrics for all shops
  const shopIds = shops.map(s => s.id);
  const { data: allMetrics } = await supabase
    .from("metrics")
    .select("*")
    .in("shop_id", shopIds)
    .order("date", { ascending: false });

  // Group metrics by shop_id (take most recent)
  const latestMetrics = new Map<string, typeof allMetrics extends (infer T)[] | null ? T : never>();
  allMetrics?.forEach((m) => {
    if (!latestMetrics.has(m.shop_id)) latestMetrics.set(m.shop_id, m);
  });

  const results = shops.map((shop) => {
    const metrics = latestMetrics.get(shop.id);
    const cleanHandle = shop.tiktok_handle.replace("@", "");

    if (!metrics) {
      return {
        handle:    cleanHandle,
        shop_name: shop.shop_name,
        verified:  false,
        score:     null,
        risk_level: "unknown",
        error:     "No metrics available yet",
      };
    }

    const sps = computeSps({
      negative_review_rate:        metrics.negative_review_rate,
      return_rate_non_buyer_fault: metrics.return_rate_non_buyer_fault,
      cancel_rate_seller_fault:    metrics.cancel_rate_seller_fault,
      on_time_delivery_rate:       metrics.on_time_delivery_rate,
      im_dissatisfaction_rate:     metrics.im_dissatisfaction_rate,
      aftersales_handling_hours:   metrics.aftersales_handling_hours,
    });

    const isVerified = sps.score >= 3.0 && metrics.violations_count < 3;
    const baseUrl    = process.env.NEXT_PUBLIC_APP_URL ?? "https://shopreaper.io";

    return {
      handle:     cleanHandle,
      shop_name:  shop.shop_name,
      verified:   isVerified,
      score:      sps.score,
      risk_level: sps.risk,
      on_time_delivery_rate: metrics.on_time_delivery_rate,
      violations: metrics.violations_count,
      badge_url:  `${baseUrl}/api/v1/score/${cleanHandle}/badge.svg`,
      profile_url:`${baseUrl}/score/${cleanHandle}`,
      updated_at: metrics.created_at,
    };
  });

  // Find handles that weren't found
  const foundHandles = new Set(shops.map(s => s.tiktok_handle.replace("@", "").toLowerCase()));
  const notFound = handleList.filter(h => !foundHandles.has(h.toLowerCase()));

  return NextResponse.json({
    results,
    count:      results.length,
    not_found:  notFound,
    updated_at: new Date().toISOString(),
  }, {
    headers: {
      "Cache-Control":                "public, s-maxage=300",
      "Access-Control-Allow-Origin":  "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
}
