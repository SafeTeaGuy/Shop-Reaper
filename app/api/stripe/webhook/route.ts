import { NextRequest, NextResponse } from "next/server";
import { stripe, getTierFromPriceId } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig  = request.headers.get("stripe-signature")!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const supabase = await createAdminClient();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId  = session.metadata?.user_id;
      const refCode = session.metadata?.referral_code;
      if (!userId) break;

      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      );
      const priceId = subscription.items.data[0].price.id;
      const tier    = getTierFromPriceId(priceId);

      await supabase.from("users").update({
        plan_tier: tier,
        stripe_customer_id: session.customer as string,
        stripe_subscription_id: session.subscription as string,
      }).eq("id", userId);

      // Track Cash King / partner referral
      if (refCode) {
        const amount = { basic: 19, reaper: 49, agency: 99 }[tier] ?? 0;
        await supabase.from("referrals").insert({
          referrer_code:     refCode,
          referred_user_id:  userId,
          plan_tier:         tier,
          mrr:               amount,
          commission_pct:    20,
          commission_amount: amount * 0.2,
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const sub     = event.data.object as Stripe.Subscription;
      const priceId = sub.items.data[0].price.id;
      const tier    = getTierFromPriceId(priceId);

      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_subscription_id", sub.id);

      if (users?.[0]) {
        await supabase.from("users").update({ plan_tier: tier })
          .eq("id", users[0].id);

        // Update referral MRR
        const amount = { basic: 19, reaper: 49, agency: 99 }[tier] ?? 0;
        await supabase.from("referrals").update({
          plan_tier:         tier,
          mrr:               amount,
          commission_amount: amount * 0.2,
        }).eq("referred_user_id", users[0].id);
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: users } = await supabase
        .from("users")
        .select("id")
        .eq("stripe_subscription_id", sub.id);

      if (users?.[0]) {
        await supabase.from("users").update({ plan_tier: "basic" })
          .eq("id", users[0].id);
        await supabase.from("referrals").update({ status: "churned" })
          .eq("referred_user_id", users[0].id);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
