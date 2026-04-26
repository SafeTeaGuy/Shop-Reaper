import Link from "next/link";
import { Button } from "@/components/ui";

const FEATURES = [
  { icon: "📡", title: "Live Health Engine",  desc: "Real SPS, AHR, delivery rate, refund rate — pulled directly from TikTok's API. No manual entry." },
  { icon: "⚡", title: "Reaper Alerts",       desc: "SMS + in-app alerts before you hit any threshold. Every alert has a fix script." },
  { icon: "🔪", title: "SKU Autopsy",          desc: "Weekly CVR analysis of every SKU. Kill the dead weight. Double affiliate traffic on winners." },
  { icon: "💬", title: "Reaper Coach",         desc: "Ask why your shop is losing money. Get root cause, dollar impact, and exact fix steps. Powered by Claude AI." },
];

export default function CashKingPage() {
  return (
    <div className="min-h-screen bg-reaper-bg">
      {/* Hero */}
      <div className="relative overflow-hidden">
        {/* Glows */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-reaper-orange to-transparent opacity-60" />
          <div className="absolute -left-32 top-0 w-96 h-96 rounded-full bg-reaper-orange opacity-[0.04] blur-3xl" />
          <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-reaper-red opacity-[0.05] blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 pt-16 pb-12 text-center">
          {/* Cash King badge */}
          <div className="inline-flex items-center gap-3 bg-[#0d0800] border border-reaper-orange rounded-full px-5 py-2.5 mb-8">
            <span className="text-xl">👑</span>
            <span className="font-mono-dm text-[10px] tracking-[2px] text-reaper-orange uppercase">
              Cash King Exclusive · Reaper Keeper
            </span>
          </div>

          <h1 className="font-display text-[clamp(52px,9vw,96px)] leading-none tracking-wider text-reaper-text mb-2">
            SHOP REAPER
          </h1>
          <h2 className="font-display text-[clamp(24px,4vw,44px)] leading-none tracking-wider text-reaper-red mb-6">
            TIKTOK WON'T WARN YOU. WE WILL.
          </h2>

          <p className="text-reaper-muted text-lg max-w-xl mx-auto leading-relaxed mb-8">
            The tool Cash King uses to make sure his sellers never get blindsided by SPS drops, delivery penalties, or silent affiliate throttles.
          </p>

          {/* CTA */}
          <div className="flex flex-col items-center gap-3">
            <Link href="/login?ref=CASHKING">
              <button className="bg-reaper-red text-white font-mono-dm text-sm tracking-[2px] px-10 py-4 rounded-lg hover:shadow-[0_0_40px_rgba(217,26,15,0.5)] transition-all hover:-translate-y-0.5">
                START FREE 14-DAY TRIAL →
              </button>
            </Link>
            <div className="font-mono-dm text-[10px] tracking-wider text-reaper-dim">
              Code CASHKING applied automatically · No credit card required
            </div>
          </div>

          {/* 3 hero stats */}
          <div className="grid grid-cols-3 gap-px bg-reaper-border rounded-xl overflow-hidden mt-12 max-w-xl mx-auto">
            {[
              { num: "$0",   label: "Warning from TikTok before penalties" },
              { num: "40%",  label: "Affiliate visibility lost at SPS 2.5" },
              { num: "7",    label: "Days before revenue collapses silently"},
            ].map(({ num, label }) => (
              <div key={num} className="bg-reaper-bg2 px-6 py-5 text-center">
                <div className="font-display text-4xl text-reaper-red leading-none mb-1">{num}</div>
                <div className="font-mono-dm text-[9px] tracking-wider text-reaper-dim leading-tight">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cash King quote block */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <div className="bg-[#0d0800] border border-reaper-orange rounded-xl p-8 flex gap-6 items-start">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-reaper-orange to-reaper-red flex items-center justify-center text-3xl flex-shrink-0">
            👑
          </div>
          <div>
            <blockquote className="text-reaper-text text-lg leading-relaxed italic mb-3">
              &ldquo;I&apos;ve watched sellers do everything right and still wake up to dead sales because TikTok silently throttled them with zero warning. Shop Reaper is the tool I wish existed when I started. It tells you exactly what&apos;s wrong and exactly how to fix it — before the damage is permanent.&rdquo;
            </blockquote>
            <div className="font-display text-xl tracking-widest text-reaper-orange">CASH KING</div>
            <div className="font-mono-dm text-[9px] tracking-wider text-reaper-dim mt-0.5">
              @CashKing · TikTok Shop Affiliate Creator · Co-Founder
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <div className="text-center mb-8">
          <div className="font-mono-dm text-[9px] tracking-[4px] text-reaper-red uppercase mb-2">Five Systems</div>
          <h3 className="font-display text-4xl tracking-wider text-reaper-text">Zero Mercy.</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {FEATURES.map(({ icon, title, desc }) => (
            <div key={title} className="bg-reaper-bg2 border border-reaper-border rounded-xl p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-reaper-red opacity-60" />
              <div className="text-2xl mb-3">{icon}</div>
              <div className="font-display text-xl tracking-wider text-reaper-text mb-2">{title}</div>
              <div className="text-sm text-reaper-muted leading-relaxed">{desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pricing highlight */}
      <div className="max-w-5xl mx-auto px-6 mb-12">
        <div className="grid grid-cols-3 gap-4">
          {[
            { name: "Basic",  price: 19, features: "Live scores + alerts",          tier: "basic"  },
            { name: "Reaper", price: 49, features: "AI Coach + SMS + multi-account", tier: "reaper", featured: true },
            { name: "Agency", price: 99, features: "Unlimited + white-label",        tier: "agency" },
          ].map((t) => (
            <div
              key={t.name}
              className={`rounded-xl border p-6 text-center ${
                (t as { featured?: boolean }).featured
                  ? "bg-[#0d0000] border-reaper-red"
                  : "bg-reaper-bg2 border-reaper-border"
              }`}
            >
              {(t as { featured?: boolean }).featured && (
                <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-2">MOST POPULAR</div>
              )}
              <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim mb-3 uppercase">{t.name}</div>
              <div className="font-display text-5xl text-reaper-text leading-none mb-1">${t.price}</div>
              <div className="text-reaper-dim text-xs mb-4">/month</div>
              <div className="text-xs text-reaper-muted mb-5">{t.features}</div>
              <Link href={`/login?ref=CASHKING`}>
                <button className={`w-full font-mono-dm text-[10px] tracking-[1.5px] py-2.5 rounded-lg transition-all ${
                  (t as { featured?: boolean }).featured
                    ? "bg-reaper-red text-white hover:shadow-[0_0_20px_rgba(217,26,15,0.4)]"
                    : "border border-reaper-border2 text-reaper-muted hover:text-reaper-text hover:border-reaper-dim"
                }`}>
                  START FREE TRIAL
                </button>
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-4 font-mono-dm text-[10px] tracking-wider text-reaper-dim">
          14-day free trial for Cash King community · No credit card · Cancel anytime
        </div>
      </div>

      {/* Bottom CTA */}
      <div className="bg-black border-t border-reaper-border py-16 text-center px-6">
        <div className="text-5xl mb-4 inline-block">💀</div>
        <h3 className="font-display text-5xl tracking-widest text-reaper-text mb-2">STOP GUESSING.</h3>
        <h3 className="font-display text-5xl tracking-widest text-reaper-red mb-6">START REAPING.</h3>
        <Link href="/login?ref=CASHKING">
          <button className="bg-reaper-red text-white font-mono-dm text-sm tracking-[2px] px-10 py-4 rounded-lg hover:shadow-[0_0_40px_rgba(217,26,15,0.5)] transition-all">
            Connect Your TikTok Shop Free →
          </button>
        </Link>
        <div className="mt-3 font-mono-dm text-[10px] tracking-wider text-reaper-dim">
          shopreaper.io · Referred by Cash King · Code CASHKING
        </div>
      </div>
    </div>
  );
}
