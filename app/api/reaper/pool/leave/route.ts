import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { pool_deal_id } = await req.json();
  if (!pool_deal_id) return NextResponse.json({ error: "pool_deal_id is required" }, { status: 400 });

  const { error } = await supabase
    .from("pool_memberships")
    .update({ is_active: false, left_at: new Date().toISOString() })
    .eq("pool_deal_id", pool_deal_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
