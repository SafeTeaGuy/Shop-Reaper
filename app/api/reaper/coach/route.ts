import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { streamCoachResponse } from "@/lib/reaper/coach";
import type { CoachMessage, DashboardData } from "@/types";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { shopId, messages } = await request.json() as {
    shopId: string;
    messages: CoachMessage[];
  };

  // Verify ownership
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .eq("id", shopId)
    .eq("user_id", user.id)
    .single();
  if (!shop) return new Response("Not found", { status: 404 });

  // Fetch dashboard context
  const [metricsRes, alertsRes, productsRes, affiliatesRes] = await Promise.all([
    supabase.from("metrics").select("*").eq("shop_id", shopId)
      .order("date", { ascending: false }).limit(1).single(),
    supabase.from("alerts_log").select("*").eq("shop_id", shopId)
      .is("dismissed_at", null).order("created_at", { ascending: false }).limit(20),
    supabase.from("products").select("*").eq("shop_id", shopId)
      .order("revenue_30d", { ascending: false }).limit(20),
    supabase.from("affiliates").select("*").eq("shop_id", shopId).limit(50),
  ]);

  if (!metricsRes.data) {
    return new Response("No metrics yet — sync your shop first.", { status: 400 });
  }

  // Check plan tier for coach access
  const { data: userData } = await supabase
    .from("users").select("plan_tier").eq("id", user.id).single();
  if (userData?.plan_tier === "basic") {
    return new Response("Reaper Coach requires Reaper or Agency plan.", { status: 403 });
  }

  const { computeSps } = await import("@/lib/tiktok/client");
  const m = metricsRes.data;
  const sps = computeSps({
    negative_review_rate:        m.negative_review_rate,
    return_rate_non_buyer_fault: m.return_rate_non_buyer_fault,
    cancel_rate_seller_fault:    m.cancel_rate_seller_fault,
    on_time_delivery_rate:       m.on_time_delivery_rate,
    im_dissatisfaction_rate:     m.im_dissatisfaction_rate,
    aftersales_handling_hours:   m.aftersales_handling_hours,
  });

  const dashData: DashboardData = {
    shop,
    metrics: m,
    sps,
    alerts:     alertsRes.data    ?? [],
    products:   productsRes.data  ?? [],
    affiliates: affiliatesRes.data ?? [],
  };

  // Stream response
  const stream = new ReadableStream({
    async start(controller) {
      await streamCoachResponse(dashData, messages, (chunk) => {
        controller.enqueue(new TextEncoder().encode(chunk));
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Transfer-Encoding": "chunked",
      "Cache-Control": "no-cache",
    },
  });
}
