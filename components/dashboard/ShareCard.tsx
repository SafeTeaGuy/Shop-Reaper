"use client";
import { useState, useRef } from "react";
import type { ShopMetrics, SpsResult, Shop } from "@/types";
import { cn } from "@/components/ui";

// ── SHAREABLE HEALTH CARD ─────────────────────
interface HealthCardProps {
  shop: Shop;
  metrics: ShopMetrics;
  sps: SpsResult;
}

const RISK_LABELS = {
  safe:       "✅ SAFE",
  warning:    "⚠ WARNING",
  critical:   "🔴 CRITICAL",
  restricted: "💀 RESTRICTED",
};

const RISK_COLORS = {
  safe:       "#00B85A",
  warning:    "#E07000",
  critical:   "#D91A0F",
  restricted: "#880000",
};

export function ShareableHealthCard({ shop, metrics, sps }: HealthCardProps) {
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied]   = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const color   = RISK_COLORS[sps.risk];
  const today   = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  async function shareCard() {
    setSharing(true);

    const text = `💀 My Shop Reaper Score — ${today}

Shop: ${shop.shop_name} (${shop.tiktok_handle})
SPS Score: ${sps.score}/5.0 — ${RISK_LABELS[sps.risk]}
On-Time Delivery: ${metrics.on_time_delivery_rate.toFixed(1)}%
Refund Rate: ${metrics.refund_rate.toFixed(1)}%
30D Revenue: $${metrics.revenue_30d.toLocaleString()}

Monitoring my TikTok Shop health with @ShopReaper 💀
Try it free → shopreaper.io

#TikTokShop #ShopReaper #TikTokSeller`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "My Shop Reaper Score", text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      }
    } catch {}
    setSharing(false);
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Card */}
      <div
        ref={cardRef}
        className="rounded-xl overflow-hidden border"
        style={{ borderColor: color + "40", background: "linear-gradient(145deg, #0d0000, #080000)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: color + "20" }}>
          <div className="font-display text-lg tracking-[3px]" style={{ color }}>💀 SHOP REAPER</div>
          <div className="font-mono-dm text-[9px] text-reaper-dim">{today}</div>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim mb-1">{shop.tiktok_handle.toUpperCase()} · US</div>

          {/* Score */}
          <div className="flex items-end gap-3 mb-4">
            <div className="font-display leading-none" style={{ fontSize: 72, color, textShadow: `0 0 40px ${color}66` }}>
              {sps.score}
            </div>
            <div className="pb-2">
              <div className="font-mono-dm text-[10px] tracking-[2px] mb-1" style={{ color }}>
                {RISK_LABELS[sps.risk]}
              </div>
              <div className="font-mono-dm text-[9px] text-reaper-dim">SPS / 5.0</div>
            </div>
          </div>

          {/* Metrics 2x2 */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { label: "Delivery",   val: `${metrics.on_time_delivery_rate.toFixed(1)}%`, ok: metrics.on_time_delivery_rate >= 85 },
              { label: "Refund Rate", val: `${metrics.refund_rate.toFixed(1)}%`,          ok: metrics.refund_rate < 8 },
              { label: "30D Revenue", val: `$${Math.round(metrics.revenue_30d / 100) * 100 >= 1000 ? (metrics.revenue_30d / 1000).toFixed(1) + "K" : metrics.revenue_30d}`, ok: true },
              { label: "Affiliates",  val: String(metrics.affiliate_count),               ok: sps.risk !== "critical" },
            ].map(({ label, val, ok }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="font-mono-dm text-[8px] tracking-[1.5px] text-reaper-dim mb-1">{label.toUpperCase()}</div>
                <div className="font-display text-2xl leading-none" style={{ color: ok ? "#00B85A" : color }}>
                  {val}
                </div>
              </div>
            ))}
          </div>

          <div className="font-mono-dm text-[9px] text-center text-reaper-dim">
            Monitored by Shop Reaper · Real-time TikTok API
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: color + "15" }}>
          <div className="font-mono-dm text-[9px] text-reaper-dim">shopreaper.io</div>
          <div className="text-lg">💀</div>
        </div>
      </div>

      {/* Share button */}
      <button
        onClick={shareCard}
        disabled={sharing}
        className={cn(
          "w-full py-3.5 rounded-xl font-mono-dm text-[11px] tracking-[2px] font-bold transition-all",
          "text-reaper-bg",
          sharing ? "opacity-70 cursor-not-allowed" : "hover:-translate-y-0.5"
        )}
        style={{ background: color, boxShadow: `0 4px 24px ${color}44` }}
      >
        {sharing ? "SHARING…" : copied ? "✓ COPIED TO CLIPBOARD" : "📊 SHARE MY HEALTH SCORE"}
      </button>
    </div>
  );
}

// ── REFERRAL WIDGET ───────────────────────────
interface ReferralWidgetProps {
  userId: string;
  referralCode: string;
  earnings: number;
  referralCount: number;
  isCashKing?: boolean;
}

export function ReferralWidget({
  referralCode,
  earnings,
  referralCount,
  isCashKing = false,
}: ReferralWidgetProps) {
  const [copied, setCopied] = useState(false);
  const link = `https://shopreaper.io/login?ref=${referralCode}`;

  async function copyLink() {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div
      className="rounded-xl border p-5"
      style={{
        background: "linear-gradient(135deg, #0d0a00, #080808)",
        borderColor: "rgba(201,150,10,0.2)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #E07000, #D91A0F)" }}
        >
          {isCashKing ? "👑" : "💀"}
        </div>
        <div>
          <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-gold uppercase mb-0.5">
            {isCashKing ? "Cash King · Reaper Keeper" : "Reaper Referral Program"}
          </div>
          <div className="text-sm font-bold text-reaper-text">
            Earn 20% of every seller you bring in
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { label: "REFERRALS",    val: referralCount },
          { label: "MONTHLY EARN", val: `$${(earnings * 0.2).toFixed(0)}` },
          { label: "RATE",         val: "20%" },
        ].map(({ label, val }) => (
          <div key={label} className="bg-reaper-bg3 rounded-lg p-3 text-center border border-reaper-border">
            <div className="font-display text-2xl text-reaper-gold leading-none">{val}</div>
            <div className="font-mono-dm text-[7.5px] text-reaper-dim mt-1">{label}</div>
          </div>
        ))}
      </div>

      {/* Link */}
      <div className="bg-reaper-bg3 border border-reaper-border2 rounded-lg px-4 py-3 mb-3 flex items-center justify-between gap-3">
        <div className="font-mono-dm text-[10px] text-reaper-muted truncate">{link}</div>
        <button
          onClick={copyLink}
          className={cn(
            "font-mono-dm text-[8.5px] tracking-[1.5px] px-3 py-1.5 rounded border transition-all flex-shrink-0",
            copied
              ? "border-reaper-green text-reaper-green"
              : "border-reaper-gold text-reaper-gold hover:bg-reaper-gold hover:text-reaper-bg"
          )}
        >
          {copied ? "✓ COPIED" : "COPY"}
        </button>
      </div>

      {/* Share options */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "TikTok",     emoji: "🎵", action: () => window.open(`https://www.tiktok.com/upload?caption=My+TikTok+Shop+just+got+a+health+monitor+%F0%9F%92%80+${encodeURIComponent(link)}`) },
          { label: "Copy Link",  emoji: "🔗", action: copyLink },
          { label: "Share",      emoji: "📤", action: async () => { try { await navigator.share({ title: "Shop Reaper", url: link }); } catch {} } },
        ].map(({ label, emoji, action }) => (
          <button
            key={label}
            onClick={action}
            className="flex flex-col items-center gap-1.5 py-3 rounded-lg border border-reaper-border2 text-reaper-dim hover:border-reaper-gold hover:text-reaper-gold transition-all"
          >
            <span className="text-xl">{emoji}</span>
            <span className="font-mono-dm text-[8px] tracking-wider">{label.toUpperCase()}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
