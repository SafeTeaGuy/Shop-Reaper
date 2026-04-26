import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { title, aliexpress_url, unit_price, min_units, description, category } = body;

  if (!title || !aliexpress_url || !unit_price || !min_units) {
    return NextResponse.json(
      { error: "title, aliexpress_url, unit_price, and min_units are required" },
      { status: 400 }
    );
  }

  const unitP  = Math.max(0.01, Number(unit_price));
  const minU   = Math.max(1, Math.round(Number(min_units)));
  const target = parseFloat((unitP * minU).toFixed(2));

  const { data, error } = await supabase.from("pool_deals").insert({
    title:           String(title).trim(),
    description:     description ? String(description).trim() : null,
    aliexpress_url:  String(aliexpress_url).trim(),
    unit_price:      unitP,
    min_units:       minU,
    target_amount:   target,
    category:        category ? String(category).trim() : null,
    proposed_by:     user.id,
    status:          "draft",   // admin reviews before going live
    ai_match_tags:   [],
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data }, { status: 201 });
}
