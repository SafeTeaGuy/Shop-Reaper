"use client";
import { useState } from "react";
import { Button, Badge } from "@/components/ui";
import Link from "next/link";

const TIERS = [
  {
    name:  "Basic",
    price: 19,
    tier:  "basic" as const,
    desc:  "For sellers who want live health scores and early warnings.",
    features: [
      "Live SPS + AHR monitoring",
      "Fulfillment & refund tracking",
      "Critical threshold alerts",
      "Product CVR dashboard",
      "1 TikTok account",
      "Email digest",
    ],
    featured: false,
  },
  {
    name:  "Reaper",
    price: 49,
    tier:  "reaper" as const,
    desc:  "For sellers who won't tolerate surprise restrictions.",
    features: [
      "Everything in Basic",
      "AI Reaper Coach (unlimited)",
      "SMS blast alerts",
      "Multi-account (up to 3)",
      "SKU kill recommendations",
      "Affiliate traffic analysis",
    ],
    featured: true,
  },
  {
    name:  "Agency",
    price: 99,
    tier:  "agency" as const,
    desc:  "For agencies managing multiple TikTok Shop brands.",
    features: [
      "Everything in Reaper",
      "Unlimited accounts",
      "White-label dashboard",
      "Custom alert webhooks",
      "Client reporting exports",
      "Priority support",
    ],
    featured: false,
  },
];

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);

  async function checkout(tier: "basic" | "reaper" | "agency") {
    setLoading(tier);
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier }),
    });
    if (res.status === 401) { window.location.href = "/login"; return; }
    const { url } = await res.json();
    if (url) window.location.href = url;
    setLoading(null);
  }

  return (
    <div className="min-h-screen bg-reaper-bg p-8">
      {/* Header */}
      <div className="text-center mb-12">
        <Link href="/dashboard" className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim hover:text-reaper-muted mb-6 inline-block">
          ← BACK TO DASHBOARD
        </Link>
        <h1 className="font-display text-5xl tracking-widest text-reaper-text mb-2">
          SIMPLE PRICING.
        </h1>
        <h2 className="font-display text-5xl tracking-widest text-reaper-red mb-4">
          SAVAGE ROI.
        </h2>
        <p className="text-reaper-muted text-base max-w-md mx-auto">
          Sellers on Reaper spend $49/mo. The average undetected SPS breach costs $1,400+ in lost affiliate revenue.
        </p>
        <div className="mt-4 font-mono-dm text-[10px] tracking-wider text-reaper-dim">
          Free 7-day trial · No credit card · Cancel anytime
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-3 gap-5 max-w-4xl mx-auto mb-12">
        {TIERS.map((tier) => (
          <div
            key={tier.name}
            className={`rounded-xl border p-7 relative flex flex-col transition-all duration-200 hover:-translate-y-1 ${
              tier.featured
                ? "bg-[#0d0000] border-reaper-red shadow-[0_0_40px_rgba(217,26,15,0.12)]"
                : "bg-reaper-bg2 border-reaper-border"
            }`}
          >
            {tier.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge variant="critical" className="px-3 py-1 text-[8px]">MOST POPULAR</Badge>
              </div>
            )}

            {/* Top accent */}
            <div className={`absolute top-0 left-0 right-0 h-0.5 rounded-t-xl ${
              tier.featured ? "bg-reaper-red shadow-[0_0_10px_rgba(217,26,15,0.6)]" : "bg-reaper-border"
            }`} />

            <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-4">
              {tier.name}
            </div>

            <div className="flex items-baseline gap-1 mb-1">
              <span className="font-display text-6xl text-reaper-text leading-none">${tier.price}</span>
              <span className="text-reaper-dim text-sm">/mo</span>
            </div>

            <p className="text-xs text-reaper-dim leading-relaxed mb-6">{tier.desc}</p>

            <div className="h-px bg-reaper-border mb-5" />

            <ul className="flex flex-col gap-2.5 flex-1 mb-6">
              {tier.features.map((f, i) => (
                <li key={f} className="flex items-start gap-2 text-xs text-reaper-muted">
                  <span className={`text-[10px] mt-0.5 flex-shrink-0 ${
                    i === 0 && tier.name !== "Basic" ? "text-reaper-red" : "text-reaper-green"
                  }`}>
                    {i === 0 && tier.name !== "Basic" ? "↳" : "—"}
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <Button
              variant={tier.featured ? "primary" : "ghost"}
              size="lg"
              className="w-full"
              loading={loading === tier.tier}
              onClick={() => checkout(tier.tier)}
            >
              {tier.featured ? "START FREE TRIAL" : "GET STARTED"}
            </Button>
          </div>
        ))}
      </div>

      {/* Cash King callout */}
      <div className="max-w-4xl mx-auto bg-[#0d0800] border border-[#2e1a00] rounded-xl p-6 flex items-center gap-5">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-reaper-orange to-reaper-red flex items-center justify-center text-2xl flex-shrink-0">
          👑
        </div>
        <div className="flex-1">
          <div className="font-display text-xl tracking-widest text-reaper-orange mb-0.5">CASH KING EXCLUSIVE</div>
          <div className="text-sm text-reaper-muted">
            Referred by <span className="text-reaper-orange font-semibold">@CashKing</span>? Use code{" "}
            <span className="font-mono-dm text-reaper-text bg-reaper-bg3 px-2 py-0.5 rounded text-xs">CASHKING</span>{" "}
            at checkout for an extended 14-day free trial.
          </div>
        </div>
        <Button variant="ghost" size="md" onClick={() => window.location.href = "/login?ref=CASHKING"}>
          Use Code
        </Button>
      </div>

      {/* FAQ */}
      <div className="max-w-2xl mx-auto mt-12">
        <h3 className="font-display text-2xl tracking-wider text-reaper-text text-center mb-6">COMMON QUESTIONS</h3>
        <div className="flex flex-col gap-4">
          {[
            ["Do I need to give TikTok my password?", "No. Shop Reaper connects via TikTok's official OAuth — same as how you'd authorize any app in Seller Center. You authorize it with one click, and we only get read access."],
            ["How is SPS computed?", "TikTok doesn't expose your SPS directly via API. We pull the 6 underlying metrics (review rate, return rate, delivery rate, etc.) and compute a weighted composite score that mirrors TikTok's internal calculation."],
            ["What if my API is still under review?", "TikTok Partner API review takes 5–10 business days. During that window, you can import metrics manually via CSV as a fallback. The dashboard works with either."],
            ["Can I cancel anytime?", "Yes. Cancel from the settings page — your account stays active until the end of your billing period. No cancellation fees."],
          ].map(([q, a]) => (
            <div key={q as string} className="border border-reaper-border rounded-lg p-4">
              <div className="text-sm font-semibold text-reaper-text mb-2">{q}</div>
              <div className="text-xs text-reaper-dim leading-relaxed">{a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
