import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { alertId, action } = await request.json() as {
    alertId: string;
    action: "actioned" | "dismissed";
  };

  const update =
    action === "actioned"
      ? { actioned_at: new Date().toISOString() }
      : { dismissed_at: new Date().toISOString() };

  const { error } = await supabase
    .from("alerts_log")
    .update(update)
    .eq("id", alertId)
    .filter("shop_id", "in", `(select id from shops where user_id = '${user.id}')`);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ updated: true });
}
