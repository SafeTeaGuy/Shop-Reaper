import Stripe from "stripe";
import type { PlanTier } from "@/types";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-11-20.acacia",
});

export async function createCheckoutSession({
  userId,
  email,
  tier,
  referralCode,
}: {
  userId: string;
  email: string;
  tier: PlanTier;
  referralCode?: string;
}) {
  const priceId =
    tier === "basic"  ? process.env.STRIPE_BASIC_PRICE_ID  :
    tier === "reaper" ? process.env.STRIPE_REAPER_PRICE_ID :
    process.env.STRIPE_AGENCY_PRICE_ID;

  return stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      trial_period_days: 7,
      metadata: { user_id: userId, referral_code: referralCode ?? "" },
    },
    metadata: { user_id: userId, referral_code: referralCode ?? "" },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?upgraded=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing`,
    allow_promotion_codes: true,
  });
}

export async function createPortalSession(stripeCustomerId: string) {
  return stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  });
}

export function getTierFromPriceId(priceId: string): PlanTier {
  if (priceId === process.env.STRIPE_BASIC_PRICE_ID)  return "basic";
  if (priceId === process.env.STRIPE_REAPER_PRICE_ID) return "reaper";
  if (priceId === process.env.STRIPE_AGENCY_PRICE_ID) return "agency";
  return "basic";
}
