import { notFound }  from "next/navigation";
import { createAdminClient } from "@/lib/supabase/server";
import { computeSps } from "@/lib/tiktok/client";
import type { Metadata } from "next";
import Link from "next/link";

// ── TYPES ─────────────────────────────────────
interface ScorePageProps {
  params: Promise<{ handle: string }>;
}

// ── METADATA ──────────────────────────────────
export async function generateMetadata({ params }: ScorePageProps): Promise<Metadata> {
  const { handle } = await params;
  const supabase = await createAdminClient();
  const { data: shop } = await supabase
    .from("shops").select("shop_name, tiktok_handle").eq("tiktok_handle", `@${handle}`).single();

  if (!shop) return { title: "Shop Not Found — Shop Reaper" };

  return {
    title:       `${shop.shop_name} — Reaper Score`,
    description: `View the live Reaper Score and health metrics for ${shop.shop_name} on TikTok Shop.`,
    openGraph: {
      title:       `${shop.shop_name} — Reaper Score`,
      description: `Live TikTok Shop health metrics. SPS score, delivery rate, and affiliate status.`,
      images:      [`/api/v1/score/${handle}/og`],
    },
    twitter: { card: "summary_large_image" },
  };
}

// ── PAGE ──────────────────────────────────────
export default async function ScorePage({ params }: ScorePageProps) {
  const { handle } = await params;
  const supabase = await createAdminClient();

  // Fetch shop by handle
  const { data: shop } = await supabase
    .from("shops")
    .select("*")
    .or(`tiktok_handle.eq.@${handle},tiktok_handle.eq.${handle}`)
    .eq("is_active", true)
    .single();

  if (!shop) notFound();

  // Fetch latest metrics
  const { data: metrics } = await supabase
    .from("metrics")
    .select("*")
    .eq("shop_id", shop.id)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  // Fetch score history (last 8 weeks)
  const { data: history } = await supabase
    .from("metrics")
    .select("date, sps_computed, on_time_delivery_rate, refund_rate")
    .eq("shop_id", shop.id)
    .order("date", { ascending: false })
    .limit(8);

  if (!metrics) notFound();

  const sps = computeSps({
    negative_review_rate:        metrics.negative_review_rate,
    return_rate_non_buyer_fault: metrics.return_rate_non_buyer_fault,
    cancel_rate_seller_fault:    metrics.cancel_rate_seller_fault,
    on_time_delivery_rate:       metrics.on_time_delivery_rate,
    im_dissatisfaction_rate:     metrics.im_dissatisfaction_rate,
    aftersales_handling_hours:   metrics.aftersales_handling_hours,
  });

  const isVerified = sps.score >= 3.0 && metrics.violations_count < 3;

  const scoreColor =
    sps.risk === "safe"     ? "text-reaper-green" :
    sps.risk === "warning"  ? "text-reaper-orange" :
    "text-reaper-red";

  const METRIC_ROWS = [
    { label: "On-Time Delivery",    val: `${metrics.on_time_delivery_rate.toFixed(1)}%`, threshold: "Min: 85%",  ok: metrics.on_time_delivery_rate >= 85 },
    { label: "Negative Review Rate", val: `${metrics.negative_review_rate.toFixed(2)}%`, threshold: "Max: 2%",   ok: metrics.negative_review_rate < 2 },
    { label: "Return Rate",          val: `${metrics.return_rate_non_buyer_fault.toFixed(1)}%`, threshold: "Max: 5%", ok: metrics.return_rate_non_buyer_fault < 5 },
    { label: "Seller Cancel Rate",   val: `${metrics.cancel_rate_seller_fault.toFixed(2)}%`,   threshold: "Max: 1%", ok: metrics.cancel_rate_seller_fault < 1 },
    { label: "Aftersales Handling",  val: `${metrics.aftersales_handling_hours.toFixed(0)}h`,  threshold: "Max: 48h", ok: metrics.aftersales_handling_hours < 48 },
    { label: "Active Violations",    val: String(metrics.violations_count),                    threshold: "Review at: 3", ok: metrics.violations_count === 0 },
  ];

  const shareUrl = `https://shopreaper.io/score/${handle}`;
  const badgeUrl = `/api/v1/score/${handle}/badge.svg`;

  return (
    <div className="min-h-screen bg-reaper-bg">
      {/* Nav */}
      <nav className="border-b border-reaper-border bg-reaper-bg2 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1C0000] border border-reaper-red rounded-md flex items-center justify-center text-base">💀</div>
          <div className="font-display text-xl tracking-widest text-reaper-red">SHOP REAPER</div>
        </Link>
        <Link href="/login">
          <button className="font-mono-dm text-[9px] tracking-[2px] border border-reaper-border2 text-reaper-muted px-4 py-2 rounded hover:border-reaper-dim hover:text-reaper-text transition-all">
            CHECK MY SHOP →
          </button>
        </Link>
      </nav>

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className={`absolute inset-0 ${isVerified
            ? "bg-[radial-gradient(ellipse_80%_50%_at_60%_0%,rgba(0,184,90,0.07)_0%,transparent_60%)]"
            : "bg-[radial-gradient(ellipse_80%_50%_at_60%_0%,rgba(217,26,15,0.07)_0%,transparent_60%)]"}`} />
        </div>

        <div className="max-w-6xl mx-auto px-6 py-16 grid grid-cols-[1fr_400px] gap-16 items-start relative z-10">
          {/* Left */}
          <div>
            <div className="font-mono-dm text-[9px] tracking-[4px] text-reaper-dim uppercase mb-4 flex items-center gap-2">
              <span className="w-6 h-px bg-reaper-dim block" />
              Reaper Score · Live Data
            </div>

            <div className="font-mono-dm text-[10px] tracking-[2px] text-reaper-dim mb-1">{shop.tiktok_handle} · US</div>
            <h1 className="font-display text-6xl tracking-wider text-reaper-text leading-none mb-5">{shop.shop_name}</h1>

            {/* Score */}
            <div className="flex items-end gap-4 mb-6">
              <div className={`font-display leading-none ${scoreColor}`} style={{ fontSize: "clamp(80px,12vw,120px)", textShadow: isVerified ? "0 0 80px rgba(0,184,90,0.25)" : "0 0 80px rgba(217,26,15,0.25)" }}>
                {sps.score.toFixed(1)}
              </div>
              <div className="pb-3">
                <div className="font-display text-3xl text-reaper-dim mb-2">/ 5.0</div>
                <div className="flex items-center gap-2 mb-1">
                  <div className={`w-2.5 h-2.5 rounded-full ${isVerified ? "bg-reaper-green shadow-[0_0_8px_rgba(0,184,90,1)]" : "bg-reaper-red shadow-[0_0_8px_rgba(217,26,15,1)]"} animate-pulse`} />
                  <div className={`font-mono-dm text-[10px] tracking-[2px] ${isVerified ? "text-reaper-green" : "text-reaper-red"}`}>
                    {isVerified ? "✅ VERIFIED" : "⚠ UNVERIFIED"}
                  </div>
                </div>
                <div className="font-mono-dm text-[9px] text-reaper-dim">
                  Updated {metrics.date}
                </div>
              </div>
            </div>

            {/* Quick metrics */}
            <div className="flex flex-wrap gap-2 mb-8">
              {[
                { label: "Delivery",   val: `${metrics.on_time_delivery_rate.toFixed(1)}%`, ok: metrics.on_time_delivery_rate >= 85 },
                { label: "Refunds",    val: `${metrics.refund_rate.toFixed(1)}%`,           ok: metrics.refund_rate < 8 },
                { label: "Violations", val: String(metrics.violations_count),               ok: metrics.violations_count === 0 },
              ].map(({ label, val, ok }) => (
                <div key={label} className="bg-reaper-bg2 border border-reaper-border rounded-lg px-4 py-3">
                  <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-1">{label}</div>
                  <div className={`font-display text-2xl ${ok ? "text-reaper-green" : "text-reaper-red"}`}>{val}</div>
                </div>
              ))}
            </div>

            {/* CTAs */}
            <div className="flex gap-3 flex-wrap">
              {isVerified && (
                <a
                  href={`mailto:?subject=Partnership%20Inquiry%20—%20${shop.shop_name}&body=Hi%2C%20I%20found%20your%20shop%20on%20Shop%20Reaper%20and%20would%20love%20to%20discuss%20an%20affiliate%20partnership.%0A%0AShop%20profile%3A%20${shareUrl}`}
                  className="inline-flex items-center gap-2 bg-reaper-green text-black font-mono-dm text-[10px] tracking-[2px] font-bold px-6 py-3 rounded-lg hover:shadow-[0_0_30px_rgba(0,184,90,0.4)] transition-all"
                >
                  ✅ Partner With This Shop
                </a>
              )}
              <button
                onClick={() => navigator.clipboard?.writeText(shareUrl)}
                className="inline-flex items-center gap-2 border border-reaper-border2 text-reaper-muted font-mono-dm text-[10px] tracking-[2px] px-6 py-3 rounded-lg hover:border-reaper-dim hover:text-reaper-text transition-all"
              >
                🔗 Share Profile
              </button>
            </div>
          </div>

          {/* Right — floating score card */}
          <div className="sticky top-24">
            <div
              className="rounded-2xl overflow-hidden border"
              style={{
                background: "linear-gradient(145deg,#0a0000,#060606)",
                borderColor: isVerified ? "rgba(0,184,90,0.25)" : "rgba(217,26,15,0.25)",
                boxShadow: isVerified ? "0 0 60px rgba(0,184,90,0.08)" : "0 0 60px rgba(217,26,15,0.08)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: isVerified ? "rgba(0,184,90,0.15)" : "rgba(217,26,15,0.15)" }}>
                <div className="font-display text-base tracking-[3px] text-reaper-red">💀 SHOP REAPER</div>
                <div className={`flex items-center gap-1.5 font-mono-dm text-[8px] tracking-[2px] ${isVerified ? "text-reaper-green" : "text-reaper-red"}`}>
                  <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${isVerified ? "bg-reaper-green" : "bg-reaper-red"}`} />
                  {isVerified ? "VERIFIED" : "UNVERIFIED"}
                </div>
              </div>

              <div className="px-5 py-5">
                <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim mb-1">{shop.tiktok_handle.toUpperCase()}</div>
                <div className="flex items-end gap-3 mb-5">
                  <div className={`font-display leading-none ${scoreColor}`} style={{ fontSize: 72, textShadow: isVerified ? "0 0 40px rgba(0,184,90,0.3)" : "0 0 40px rgba(217,26,15,0.3)" }}>
                    {sps.score.toFixed(1)}
                  </div>
                  <div className="pb-1">
                    <div className={`font-mono-dm text-[10px] tracking-[2px] mb-1 ${isVerified ? "text-reaper-green" : "text-reaper-red"}`}>
                      {sps.risk.toUpperCase()}
                    </div>
                    <div className="font-mono-dm text-[9px] text-reaper-dim">Updated today</div>
                  </div>
                </div>

                {/* Metric bars */}
                <div className="flex flex-col gap-2 mb-5">
                  {[
                    { label: "On-Time Delivery", pct: metrics.on_time_delivery_rate, ok: metrics.on_time_delivery_rate >= 85 },
                    { label: "Review Score",     pct: (2 - metrics.negative_review_rate) / 2 * 100, ok: metrics.negative_review_rate < 2 },
                    { label: "Refund Rate",      pct: (5 - Math.min(5, metrics.return_rate_non_buyer_fault)) / 5 * 100, ok: metrics.return_rate_non_buyer_fault < 5 },
                    { label: "Fulfillment",      pct: (48 - Math.min(48, metrics.aftersales_handling_hours)) / 48 * 100, ok: metrics.aftersales_handling_hours < 24 },
                  ].map(({ label, pct, ok }) => (
                    <div key={label} className="grid grid-cols-[110px_1fr] gap-2 items-center">
                      <div className="font-mono-dm text-[8px] text-reaper-dim">{label}</div>
                      <div className="h-1 bg-reaper-bg4 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${Math.max(0, Math.min(100, pct))}%`,
                            background: ok ? "var(--reaper-green, #00B85A)" : "var(--reaper-red, #D91A0F)",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Creator note */}
                {isVerified && (
                  <div className="bg-[rgba(0,184,90,0.06)] border border-[rgba(0,184,90,0.15)] rounded-lg p-3 mb-4">
                    <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-green mb-1.5">👋 FOR CREATORS</div>
                    <p className="text-xs text-reaper-muted leading-relaxed">
                      This shop is healthy. Safe to promote — {metrics.on_time_delivery_rate.toFixed(0)}% OTD, {metrics.violations_count} violations.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-5 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                <div className="font-mono-dm text-[8.5px] text-reaper-dim">shopreaper.io/score/{handle}</div>
                <div>💀</div>
              </div>
            </div>

            {/* Embed snippet */}
            <div className="mt-4 bg-reaper-bg2 border border-reaper-border rounded-xl p-4">
              <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim mb-2">EMBED THIS BADGE</div>
              <div className="bg-reaper-bg3 rounded-lg p-3 font-mono-dm text-[10px] text-reaper-dim mb-2 overflow-x-auto whitespace-nowrap">
                {`<img src="${badgeUrl}" height="48" />`}
              </div>
              <button
                onClick={() => navigator.clipboard?.writeText(`<a href="${shareUrl}"><img src="${badgeUrl}" height="48" alt="Reaper Verified" /></a>`)}
                className="w-full font-mono-dm text-[9px] tracking-[1.5px] border border-reaper-border2 text-reaper-dim py-2 rounded-lg hover:border-reaper-dim hover:text-reaper-muted transition-all"
              >
                COPY EMBED CODE
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed metrics */}
      <div className="max-w-6xl mx-auto px-6 py-16 border-t border-reaper-border">
        <h2 className="font-display text-4xl tracking-wider text-reaper-text mb-2">Score Breakdown</h2>
        <p className="text-reaper-muted mb-10">All metrics pulled live from TikTok Shop Partner API · Updated every 6 hours</p>

        <div className="grid grid-cols-3 gap-4 mb-12">
          {METRIC_ROWS.map(({ label, val, threshold, ok }) => (
            <div key={label} className={`rounded-xl border p-5 relative overflow-hidden ${ok ? "bg-[#001409] border-[rgba(0,184,90,0.2)]" : "bg-[#0d0000] border-[rgba(217,26,15,0.2)]"}`}>
              <div className={`absolute top-0 left-0 right-0 h-0.5 ${ok ? "bg-reaper-green shadow-[0_0_10px_rgba(0,184,90,0.6)]" : "bg-reaper-red shadow-[0_0_10px_rgba(217,26,15,0.6)]"}`} />
              <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-2">{label}</div>
              <div className={`font-display text-5xl leading-none mb-1 ${ok ? "text-reaper-green" : "text-reaper-red"}`}>{val}</div>
              <div className="font-mono-dm text-[9px] text-reaper-dim">{threshold}</div>
            </div>
          ))}
        </div>

        {/* History */}
        {history && history.length > 0 && (
          <div>
            <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-red mb-4">SCORE HISTORY — LAST 8 WEEKS</div>
            <div className="rounded-xl overflow-hidden border border-reaper-border">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-reaper-bg3">
                    {["Date", "SPS Score", "Delivery", "Refund Rate", "Trend"].map(h => (
                      <th key={h} className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim p-3 text-left border-b border-reaper-border">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {history.map((row, i) => {
                    const prev = history[i + 1];
                    const change = prev ? row.sps_computed - prev.sps_computed : 0;
                    return (
                      <tr key={row.date} className="border-b border-reaper-border last:border-b-0 hover:bg-reaper-bg3 transition-colors">
                        <td className="p-3 text-xs text-reaper-muted font-mono-dm">{row.date}</td>
                        <td className="p-3">
                          <span className={`font-display text-xl ${row.sps_computed >= 3.5 ? "text-reaper-green" : row.sps_computed >= 3.0 ? "text-reaper-orange" : "text-reaper-red"}`}>
                            {row.sps_computed.toFixed(1)}
                          </span>
                        </td>
                        <td className="p-3 text-xs text-reaper-muted font-mono-dm">{row.on_time_delivery_rate.toFixed(1)}%</td>
                        <td className="p-3 text-xs text-reaper-muted font-mono-dm">{row.refund_rate.toFixed(1)}%</td>
                        <td className="p-3 font-mono-dm text-xs">
                          {change > 0 ? <span className="text-reaper-green">↑ +{change.toFixed(1)}</span> :
                           change < 0 ? <span className="text-reaper-red">↓ {change.toFixed(1)}</span> :
                           <span className="text-reaper-dim">→ 0.0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="border-t border-reaper-border bg-reaper-bg2 py-12 text-center px-6">
        <div className="font-display text-4xl tracking-wider text-reaper-text mb-2">Monitor Your Own Shop</div>
        <p className="text-reaper-muted mb-6 max-w-md mx-auto">Connect your TikTok Shop to get real-time health monitoring, brutality alerts, and your own Reaper Score badge.</p>
        <Link href="/login">
          <button className="bg-reaper-red text-white font-mono-dm text-[10px] tracking-[2px] px-8 py-3.5 rounded-lg hover:shadow-[0_0_30px_rgba(217,26,15,0.4)] transition-all">
            💀 GET MY REAPER SCORE →
          </button>
        </Link>
        <div className="font-mono-dm text-[9px] text-reaper-dim mt-3">Free 7-day trial · shopreaper.io</div>
      </div>
    </div>
  );
}
