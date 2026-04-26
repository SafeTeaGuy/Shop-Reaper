import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SkuStatus, ProductSource } from "@/types";

function cvrToStatus(cvr: number): SkuStatus {
  if (cvr >= 3) return "hero";
  if (cvr >= 2) return "monitor";
  if (cvr >= 1) return "warning";
  return "dying";
}

// POST — add a manual or AliExpress product
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { shop_id, name, price, cvr_30d, source, source_url } = body;

  if (!shop_id || !name || cvr_30d === undefined) {
    return NextResponse.json({ error: "shop_id, name, and cvr_30d are required" }, { status: 400 });
  }

  // Verify ownership
  const { data: shop } = await supabase
    .from("shops").select("id").eq("id", shop_id).eq("user_id", user.id).single();
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  const cvr = Math.max(0, Math.min(100, Number(cvr_30d)));
  const productSource: ProductSource = ["manual", "aliexpress"].includes(source) ? source : "manual";

  const { data, error } = await supabase.from("products").insert({
    shop_id,
    name: String(name).trim(),
    price:      Number(price) || 0,
    cvr_7d:     cvr,
    cvr_30d:    cvr,
    status:     cvrToStatus(cvr),
    source:     productSource,
    source_url: source_url ? String(source_url).trim() : null,
    tiktok_sku_id: null,
    revenue_30d:           0,
    orders_30d:            0,
    refund_count_30d:      0,
    impressions_30d:       0,
    affiliate_traffic_share: 0,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}

// DELETE — remove a manual product (only source=manual|aliexpress allowed)
export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  // Fetch product and verify it's manual
  const { data: product } = await supabase
    .from("products").select("id, shop_id, source").eq("id", id).single();
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (product.source === "tiktok") {
    return NextResponse.json({ error: "TikTok-synced products cannot be deleted here" }, { status: 403 });
  }

  // Verify shop ownership
  const { data: shop } = await supabase
    .from("shops").select("id").eq("id", product.shop_id).eq("user_id", user.id).single();
  if (!shop) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
