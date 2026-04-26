import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { triggerShopSync } from "@/lib/inngest/jobs";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { shopId } = await request.json();

  const { data: shop } = await supabase
    .from("shops").select("id").eq("id", shopId).eq("user_id", user.id).single();
  if (!shop) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await triggerShopSync(shopId);
  return NextResponse.json({ queued: true });
}
