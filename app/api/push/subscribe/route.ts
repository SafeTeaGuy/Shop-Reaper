import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Store push subscription for this user
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subscription = await request.json();

  // Store in Supabase — upsert by user_id + endpoint
  await supabase.from("push_subscriptions").upsert({
    user_id:  user.id,
    endpoint: subscription.endpoint,
    p256dh:   subscription.keys?.p256dh,
    auth:     subscription.keys?.auth,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,endpoint" });

  return NextResponse.json({ subscribed: true });
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { endpoint } = await request.json();
  await supabase.from("push_subscriptions")
    .delete().eq("user_id", user.id).eq("endpoint", endpoint);

  return NextResponse.json({ unsubscribed: true });
}
