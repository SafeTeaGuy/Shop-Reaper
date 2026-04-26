import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// POST — upsert manual shop health metrics
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { shop_id, sps_computed, on_time_delivery_rate, refund_rate, revenue_30d } = body;

  if (!shop_id) return NextResponse.json({ error: "shop_id is required" }, { status: 400 });

  const { data: shop } = await supabase
    .from("shops").select("id").eq("id", shop_id).eq("user_id", user.id).single();
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const { data, error } = await supabase.from("manual_shop_health").upsert({
    shop_id,
    sps_computed:          Math.max(0, Math.min(5,   Number(sps_computed)          || 0)),
    on_time_delivery_rate: Math.max(0, Math.min(100, Number(on_time_delivery_rate) || 0)),
    refund_rate:           Math.max(0, Math.min(100, Number(refund_rate)           || 0)),
    revenue_30d:           Math.max(0,               Number(revenue_30d)           || 0),
    updated_at: new Date().toISOString(),
  }, { onConflict: "shop_id" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}
