import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { pool_deal_id, shop_id, contribution_pct, stripe_payment_method_id } = body;

  if (!pool_deal_id || !shop_id || !contribution_pct) {
    return NextResponse.json({ error: "pool_deal_id, shop_id, and contribution_pct are required" }, { status: 400 });
  }

  const pct = Number(contribution_pct);
  if (pct <= 0 || pct > 20) {
    return NextResponse.json({ error: "contribution_pct must be between 0.1 and 20" }, { status: 400 });
  }

  // Verify shop ownership
  const { data: shop } = await supabase
    .from("shops").select("id").eq("id", shop_id).eq("user_id", user.id).single();
  if (!shop) return NextResponse.json({ error: "Shop not found" }, { status: 404 });

  // Verify deal is open
  const { data: deal } = await supabase
    .from("pool_deals").select("id, status").eq("id", pool_deal_id).single();
  if (!deal) return NextResponse.json({ error: "Deal not found" }, { status: 404 });
  if (deal.status !== "open") {
    return NextResponse.json({ error: "This deal is no longer accepting members" }, { status: 409 });
  }

  // Upsert membership (re-join if previously left)
  const { data, error } = await supabase.from("pool_memberships").upsert({
    pool_deal_id,
    user_id:                  user.id,
    shop_id,
    contribution_pct:         pct,
    stripe_payment_method_id: stripe_payment_method_id ?? null,
    is_active:                true,
    left_at:                  null,
    joined_at:                new Date().toISOString(),
  }, { onConflict: "pool_deal_id,user_id" }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
