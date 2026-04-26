// Demo page — no auth, mock data. Remove before production.
import { Card, Badge, SectionLabel } from "@/components/ui";
import type { Product, Affiliate } from "@/types";

// ── MOCK DATA (NOT READY scenario) ──────────────
const MOCK_SHOP = { shop_name: "Luxe Finds Co.", tiktok_handle: "@luxefinds" };

const MOCK_METRICS = {
  sps_computed: 2.9,
  on_time_delivery_rate: 78.4,
  refund_rate: 3.2,
  revenue_30d: 12400,
};

const MOCK_PRODUCTS: Partial<Product>[] = [
  { id: "1", name: "Glow Serum 30ml",       cvr_30d: 4.1, revenue_30d: 4200 },
  { id: "2", name: "Vitamin C Drops",        cvr_30d: 3.3, revenue_30d: 2900 },
  { id: "3", name: "Hydro Face Mist",        cvr_30d: 2.6, revenue_30d: 1800 },
  { id: "4", name: "Retinol Night Cream",    cvr_30d: 2.1, revenue_30d: 1100 },
  { id: "5", name: "Eye Contour Gel",        cvr_30d: 1.4, revenue_30d:  780 },
  { id: "6", name: "Toning Essence Travel",  cvr_30d: 0.9, revenue_30d:  420 },
  { id: "7", name: "Lip Plump Gloss",        cvr_30d: 0.4, revenue_30d:  190 },
];

const MOCK_AFFILIATES: Partial<Affiliate>[] = [
  { id: "1", creator_handle: "glowwithsara",    total_revenue_attributed: 3800, status: "active" },
  { id: "2", creator_handle: "skincarejunkie_",  total_revenue_attributed: 2100, status: "active" },
  { id: "3", creator_handle: "beautybykim",      total_revenue_attributed: 1240, status: "active" },
  { id: "4", creator_handle: "theskinglow",      total_revenue_attributed:  640, status: "at_risk" },
  { id: "5", creator_handle: "dailydewlook",     total_revenue_attributed:  290, status: "churned" },
];

// ── CONSTANTS ────────────────────────────────────
const GMV_SPS_MIN    = 3.5;
const GMV_OTD_MIN    = 85;
const GMV_REFUND_MAX = 5;
const GMV_CVR_HERO   = 3.0;
const GMV_CVR_TEST   = 2.0;

export default function GmvDemo() {
  const m = MOCK_METRICS;

  const spsOk    = m.sps_computed >= GMV_SPS_MIN;
  const otdOk    = m.on_time_delivery_rate >= GMV_OTD_MIN;
  const refundOk = m.refund_rate < GMV_REFUND_MAX;

  const blockers = [
    !spsOk && { metric: "sps",    label: "Seller Performance Score", current: m.sps_computed.toFixed(1),               target: `≥${GMV_SPS_MIN}`,    fix: "Improve on-time delivery and reduce cancellations to lift SPS." },
    !otdOk && { metric: "otd",    label: "On-Time Delivery Rate",    current: `${m.on_time_delivery_rate.toFixed(1)}%`, target: `≥${GMV_OTD_MIN}%`,   fix: "Audit your fulfillment SLA. Pause slow-shipping SKUs until OTD recovers." },
    !refundOk && { metric: "ref", label: "Refund Rate",              current: `${m.refund_rate.toFixed(1)}%`,           target: `<${GMV_REFUND_MAX}%`, fix: "Review your top-refunded SKUs and set accurate listing expectations." },
  ].filter(Boolean) as { metric: string; label: string; current: string; target: string; fix: string }[];

  const spsScore    = spsOk    ? 40 : Math.round((m.sps_computed / GMV_SPS_MIN) * 40);
  const otdScore    = otdOk    ? 35 : Math.round((m.on_time_delivery_rate / GMV_OTD_MIN) * 35);
  const refundScore = refundOk ? 25 : 25;
  const score = Math.min(100, spsScore + otdScore + refundScore);

  const assumedBudget = Math.max(200, m.revenue_30d * 0.05);
  let wasteRate = 0;
  if (!spsOk) wasteRate += ((GMV_SPS_MIN - m.sps_computed) / GMV_SPS_MIN) * 0.55;
  if (!otdOk) wasteRate += ((GMV_OTD_MIN - m.on_time_delivery_rate) / GMV_OTD_MIN) * 0.30;
  const wastedSpend = Math.round(assumedBudget * Math.min(wasteRate, 1) / 10) * 10;

  const ready = blockers.length === 0;
  const budgetSignal = !ready ? "pause" : score >= 85 ? "scale" : "hold";
  const budgetReason = !ready
    ? `${blockers.length} health issue${blockers.length > 1 ? "s" : ""} will drain your GMV Max budget with poor conversion. Fix blockers first.`
    : score >= 85
      ? "All health metrics are strong. Scale your GMV Max budget — your shop will convert efficiently."
      : "Shop is ready but not at peak health. Run GMV Max at a conservative budget and monitor daily.";

  const skuRun  = MOCK_PRODUCTS.filter((p) => (p.cvr_30d ?? 0) >= GMV_CVR_HERO);
  const skuTest = MOCK_PRODUCTS.filter((p) => (p.cvr_30d ?? 0) >= GMV_CVR_TEST && (p.cvr_30d ?? 0) < GMV_CVR_HERO);
  const skuSkip = MOCK_PRODUCTS.filter((p) => (p.cvr_30d ?? 0) < GMV_CVR_TEST);

  const scoreColor = score >= 80 ? "text-reaper-green" : score >= 50 ? "text-reaper-orange" : "text-reaper-red";

  const signalColors = {
    scale: { bg: "bg-[#001409]", border: "border-reaper-green",  text: "text-reaper-green",  badge: "safe"     as const },
    hold:  { bg: "bg-[#0d0800]", border: "border-reaper-orange", text: "text-reaper-orange", badge: "warning"  as const },
    pause: { bg: "bg-[#0d0000]", border: "border-reaper-red",    text: "text-reaper-red",    badge: "critical" as const },
  }[budgetSignal];

  return (
    <div className="min-h-screen bg-reaper-bg p-6">
      <div className="max-w-7xl mx-auto">
        {/* Demo banner */}
        <div className="mb-4 bg-[#001422] border border-sky-400 rounded-lg px-4 py-2.5 flex items-center gap-3">
          <Badge variant="info">DEMO</Badge>
          <span className="text-[11px] text-sky-400 font-mono-dm tracking-wide">
            Mock data — shop NOT ready scenario (SPS 2.9, OTD 78.4%, refund clean)
          </span>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
            {MOCK_SHOP.shop_name} · {MOCK_SHOP.tiktok_handle}
          </div>
          <h1 className="font-display text-3xl tracking-wider text-reaper-text">GMV MAX READINESS</h1>
          <p className="text-reaper-muted text-sm mt-1">
            GMV Max is only as good as your shop health. Run it on a broken shop and you&apos;re just burning budget.
          </p>
        </div>

        {/* Hero row */}
        <div className="grid grid-cols-[280px_1fr] gap-4 mb-4">
          <Card accent={ready ? "green" : score >= 50 ? "orange" : "red"} className="p-5 flex flex-col items-center justify-center gap-3 text-center">
            <div className="font-mono-dm text-[8px] tracking-[3px] text-reaper-dim">READINESS SCORE</div>
            <div className={`font-display text-7xl leading-none ${scoreColor}`}>{score}</div>
            <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim">/ 100</div>
            <Badge variant={ready ? "safe" : score >= 50 ? "warning" : "critical"} pulse={!ready} className="mt-1">
              {ready ? "✓ READY FOR GMV MAX" : "✗ NOT READY"}
            </Badge>
            {!ready && wastedSpend > 0 && (
              <div className="mt-2 w-full rounded border border-reaper-red bg-[#0a0000] px-3 py-2.5">
                <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim mb-0.5">EST. WASTED SPEND</div>
                <div className="font-display text-3xl text-reaper-red">${wastedSpend.toLocaleString()}</div>
                <div className="font-mono-dm text-[8px] text-reaper-dim">per month at current health</div>
              </div>
            )}
          </Card>

          <Card accent={ready ? "green" : "red"} className="p-5">
            <SectionLabel>💀 Fix These Before Launching GMV Max</SectionLabel>
            <div className="flex flex-col gap-3 mt-2">
              {blockers.map((b) => (
                <div key={b.metric} className="rounded border border-reaper-red bg-[#0a0000] p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono-dm text-[9px] tracking-wider text-reaper-muted uppercase">{b.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg text-reaper-red">{b.current}</span>
                      <span className="font-mono-dm text-[8px] text-reaper-dim">→ target {b.target}</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-reaper-dim leading-relaxed">{b.fix}</p>
                </div>
              ))}
              {/* Passing check */}
              {refundOk && (
                <div className="rounded border border-reaper-green bg-[#001409] p-2.5 flex items-center justify-between">
                  <span className="font-mono-dm text-[9px] text-reaper-green tracking-wider">✓ REFUND RATE CLEAR</span>
                  <span className="font-display text-lg text-reaper-green">{m.refund_rate.toFixed(1)}%</span>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* SKU Selector */}
        <Card className="p-5 mb-4">
          <SectionLabel>SKU Selector — Which Products to Run GMV Max On</SectionLabel>
          <p className="text-[11px] text-reaper-dim mb-4">
            Running GMV Max on a 0.4% CVR SKU burns budget. Running it on a 4%+ CVR hero SKU is a multiplier.
            CVR thresholds: Run ≥{GMV_CVR_HERO}% · Test {GMV_CVR_TEST}–{GMV_CVR_HERO}% · Skip &lt;{GMV_CVR_TEST}%
          </p>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-reaper-green" />
                <span className="font-mono-dm text-[9px] tracking-[2px] text-reaper-green">RUN GMV MAX · {skuRun.length} SKUs</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {skuRun.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2 bg-[#001409] border-reaper-green">
                    <span className="text-[11px] text-reaper-text truncate flex-1 mr-2">{p.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-display text-lg leading-none text-reaper-green">{p.cvr_30d?.toFixed(1)}%</span>
                      <span className="font-mono-dm text-[8px] text-reaper-dim">CVR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-reaper-orange" />
                <span className="font-mono-dm text-[9px] tracking-[2px] text-reaper-orange">TEST CAREFULLY · {skuTest.length} SKUs</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {skuTest.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2 bg-[#0d0800] border-reaper-orange">
                    <span className="text-[11px] text-reaper-text truncate flex-1 mr-2">{p.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-display text-lg leading-none text-reaper-orange">{p.cvr_30d?.toFixed(1)}%</span>
                      <span className="font-mono-dm text-[8px] text-reaper-dim">CVR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-reaper-red" />
                <span className="font-mono-dm text-[9px] tracking-[2px] text-reaper-red">DON&apos;T RUN · {skuSkip.length} SKUs</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {skuSkip.map((p) => (
                  <div key={p.id} className="flex items-center justify-between rounded border px-3 py-2 bg-reaper-bg3 border-reaper-border">
                    <span className="text-[11px] text-reaper-text truncate flex-1 mr-2">{p.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="font-display text-lg leading-none text-reaper-red">{p.cvr_30d?.toFixed(1)}%</span>
                      <span className="font-mono-dm text-[8px] text-reaper-dim">CVR</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Budget Signal + Creator Scorer */}
        <div className="grid grid-cols-2 gap-4">
          <Card className={`p-5 border ${signalColors.border} ${signalColors.bg}`}>
            <SectionLabel>Budget Signal</SectionLabel>
            <div className="flex items-center gap-3 mt-3 mb-4">
              <div className={`font-display text-5xl leading-none ${signalColors.text}`}>{budgetSignal.toUpperCase()}</div>
              <Badge variant={signalColors.badge}>GMV MAX BUDGET</Badge>
            </div>
            <p className="text-[12px] text-reaper-muted leading-relaxed mb-4">{budgetReason}</p>
            <div className="flex flex-col gap-2">
              {(["scale", "hold", "pause"] as const).map((s) => {
                const active = s === budgetSignal;
                const c = { scale: "text-reaper-green", hold: "text-reaper-orange", pause: "text-reaper-red" }[s];
                const labels = {
                  scale: { h: "Scale budget when:", d: `SPS ≥${GMV_SPS_MIN} + OTD ≥${GMV_OTD_MIN}% + Refund <${GMV_REFUND_MAX}% + score ≥85` },
                  hold:  { h: "Hold budget when:",  d: "All checks pass but score 50–84. Run conservatively and watch." },
                  pause: { h: "Pause budget when:", d: "Any blocker is failing. Every dollar spent is wasted conversion." },
                }[s];
                return (
                  <div key={s} className={`rounded border border-reaper-border p-2.5 transition-all ${active ? "bg-reaper-bg3 border-opacity-60" : "opacity-40"}`}>
                    <div className={`font-mono-dm text-[8px] tracking-wider uppercase mb-0.5 ${active ? c : "text-reaper-dim"}`}>
                      {active && "▶ "}{labels.h}
                    </div>
                    <div className="text-[10px] text-reaper-dim">{labels.d}</div>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="p-5">
            <SectionLabel>Creator Content Scorer</SectionLabel>
            <p className="text-[11px] text-reaper-dim mb-4">
              GMV Max picks up shoppable affiliate videos. Authorize your highest-converting creators — their content will be amplified by the algorithm.
            </p>
            <div className="flex flex-col gap-2">
              {MOCK_AFFILIATES.map((a, i) => {
                const top = MOCK_AFFILIATES[0].total_revenue_attributed ?? 1;
                const gmvScore = Math.min(100, Math.round(((a.total_revenue_attributed ?? 0) / top) * 100));
                return (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-reaper-border last:border-b-0">
                    <div className="font-display text-lg text-reaper-dim w-5 text-right">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono-dm text-[10px] text-reaper-text truncate">@{a.creator_handle}</div>
                      <div className="font-mono-dm text-[8px] text-reaper-dim mt-0.5">
                        ${(a.total_revenue_attributed ?? 0).toLocaleString()} attributed
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1 bg-reaper-bg3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${gmvScore >= 70 ? "bg-reaper-green" : gmvScore >= 40 ? "bg-reaper-orange" : "bg-reaper-red"}`}
                          style={{ width: `${gmvScore}%` }}
                        />
                      </div>
                      <Badge
                        variant={a.status === "active" ? "safe" : a.status === "at_risk" ? "warning" : "ghost"}
                        className="text-[7px]"
                      >
                        {a.status === "active" ? "AUTHORIZE" : a.status === "at_risk" ? "AT RISK" : "CHURNED"}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
