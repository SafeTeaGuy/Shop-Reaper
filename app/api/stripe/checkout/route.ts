import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession } from "@/lib/stripe/client";
import { z } from "zod";
import type { PlanTier } from "@/types";

const schema = z.object({
  tier: z.enum(["basic", "reaper", "agency"]),
});

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { tier } = schema.parse(body);

  const { data: userData } = await supabase
    .from("users")
    .select("referred_by")
    .eq("id", user.id)
    .single();

  const session = await createCheckoutSession({
    userId: user.id,
    email:  user.email!,
    tier:   tier as PlanTier,
    referralCode: userData?.referred_by ?? undefined,
  });

  return NextResponse.json({ url: session.url });
}
