import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeSps } from "@/lib/tiktok/client";
import { Card, Badge, SectionLabel } from "@/components/ui";
import { ProductCatalog } from "@/components/dashboard/ProductCatalog";
import { ManualHealthForm } from "@/components/dashboard/ManualHealthForm";
import type { Product, Affiliate, ShopMetrics, ManualShopHealth } from "@/types";

// ── GMV MAX THRESHOLDS ──────────────────────────
const GMV_SPS_MIN    = 3.5;
const GMV_OTD_MIN    = 85;
const GMV_REFUND_MAX = 5;
const GMV_CVR_HERO   = 3.0;
const GMV_CVR_TEST   = 2.0;

// ── READINESS COMPUTATION ───────────────────────
interface GmvBlocker {
  metric: string;
  label: string;
  current: string;
  target: string;
  fix: string;
}

interface GmvReadiness {
  score: number;
  ready: boolean;
  blockers: GmvBlocker[];
  wastedSpend: number;
  budgetSignal: "scale" | "hold" | "pause";
  budgetReason: string;
  metricsSource: "tiktok" | "manual";
}

type MetricsInput = Pick<ShopMetrics,
  | "sps_computed" | "on_time_delivery_rate" | "refund_rate" | "revenue_30d"
>;

function computeGmvReadiness(m: MetricsInput, source: "tiktok" | "manual"): GmvReadiness {
  const spsOk    = m.sps_computed >= GMV_SPS_MIN;
  const otdOk    = m.on_time_delivery_rate >= GMV_OTD_MIN;
  const refundOk = m.refund_rate < GMV_REFUND_MAX;

  const blockers: GmvBlocker[] = [];
  if (!spsOk) blockers.push({
    metric: "sps",    label: "Seller Performance Score",
    current: m.sps_computed.toFixed(1),               target: `≥${GMV_SPS_MIN}`,
    fix: "Improve on-time delivery and reduce cancellations to lift SPS.",
  });
  if (!otdOk) blockers.push({
    metric: "otd",    label: "On-Time Delivery Rate",
    current: `${m.on_time_delivery_rate.toFixed(1)}%`, target: `≥${GMV_OTD_MIN}%`,
    fix: "Audit your fulfillment SLA. Pause slow-shipping SKUs until OTD recovers.",
  });
  if (!refundOk) blockers.push({
    metric: "refund", label: "Refund Rate",
    current: `${m.refund_rate.toFixed(1)}%`,           target: `<${GMV_REFUND_MAX}%`,
    fix: "Review top-refunded SKUs. Improve listings and set accurate expectations.",
  });

  const spsScore    = spsOk    ? 40 : Math.round(Math.max(0, m.sps_computed / GMV_SPS_MIN) * 40);
  const otdScore    = otdOk    ? 35 : Math.round(Math.max(0, m.on_time_delivery_rate / GMV_OTD_MIN) * 35);
  const refundScore = refundOk ? 25 : Math.round(
    Math.max(0, (GMV_REFUND_MAX - Math.min(m.refund_rate, GMV_REFUND_MAX * 4)) / GMV_REFUND_MAX) * 25
  );
  const score = Math.min(100, spsScore + otdScore + refundScore);

  const assumedBudget = Math.max(200, m.revenue_30d * 0.05);
  let wasteRate = 0;
  if (!spsOk)    wasteRate += ((GMV_SPS_MIN - m.sps_computed) / GMV_SPS_MIN) * 0.55;
  if (!otdOk)    wasteRate += ((GMV_OTD_MIN - m.on_time_delivery_rate) / GMV_OTD_MIN) * 0.30;
  if (!refundOk) wasteRate += Math.min((m.refund_rate - GMV_REFUND_MAX) / 10, 1) * 0.15;
  const wastedSpend = Math.round(assumedBudget * Math.min(wasteRate, 1) / 10) * 10;

  const ready = blockers.length === 0;
  let budgetSignal: GmvReadiness["budgetSignal"];
  let budgetReason: string;
  if (!ready) {
    budgetSignal = "pause";
    budgetReason = `${blockers.length} health issue${blockers.length > 1 ? "s" : ""} will drain your GMV Max budget with poor conversion. Fix blockers first.`;
  } else if (score >= 85) {
    budgetSignal = "scale";
    budgetReason = "All health metrics are strong. Scale your GMV Max budget — your shop will convert efficiently.";
  } else {
    budgetSignal = "hold";
    budgetReason = "Shop is ready but not at peak health. Run GMV Max at a conservative budget and monitor daily.";
  }

  return { score, ready, blockers, wastedSpend, budgetSignal, budgetReason, metricsSource: source };
}

function classifySkusForGmv(products: Product[]) {
  return {
    run:  products.filter((p) => p.cvr_30d >= GMV_CVR_HERO),
    test: products.filter((p) => p.cvr_30d >= GMV_CVR_TEST && p.cvr_30d < GMV_CVR_HERO),
    skip: products.filter((p) => p.cvr_30d < GMV_CVR_TEST),
  };
}

// ── PAGE ────────────────────────────────────────
export default async function GmvReadinessPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: shop } = await supabase
    .from("shops").select("*").eq("user_id", authUser.id)
    .eq("is_active", true).order("connected_at", { ascending: false }).limit(1).single();
  if (!shop) redirect("/dashboard");

  const [metricsRes, manualHealthRes, productsRes, affiliatesRes] = await Promise.all([
    supabase.from("metrics").select("*").eq("shop_id", shop.id)
      .order("date", { ascending: false }).limit(1).single(),
    supabase.from("manual_shop_health").select("*").eq("shop_id", shop.id).single(),
    supabase.from("products").select("*").eq("shop_id", shop.id)
      .order("cvr_30d", { ascending: false }),
    supabase.from("affiliates").select("*").eq("shop_id", shop.id)
      .order("total_revenue_attributed", { ascending: false }).limit(10),
  ]);

  const rawMetrics    = metricsRes.data;
  const manualHealth  = manualHealthRes.data as ManualShopHealth | null;
  const products      = (productsRes.data ?? []) as Product[];
  const affiliates    = (affiliatesRes.data ?? []) as Affiliate[];

  // Derive metrics from TikTok sync or manual entry
  let metricsInput: MetricsInput | null = null;
  let metricsSource: "tiktok" | "manual" = "tiktok";

  if (rawMetrics) {
    const sps = computeSps({
      negative_review_rate:        rawMetrics.negative_review_rate,
      return_rate_non_buyer_fault: rawMetrics.return_rate_non_buyer_fault,
      cancel_rate_seller_fault:    rawMetrics.cancel_rate_seller_fault,
      on_time_delivery_rate:       rawMetrics.on_time_delivery_rate,
      im_dissatisfaction_rate:     rawMetrics.im_dissatisfaction_rate,
      aftersales_handling_hours:   rawMetrics.aftersales_handling_hours,
    });
    metricsInput = {
      sps_computed:          sps.score,
      on_time_delivery_rate: rawMetrics.on_time_delivery_rate,
      refund_rate:           rawMetrics.refund_rate,
      revenue_30d:           rawMetrics.revenue_30d,
    };
    metricsSource = "tiktok";
  } else if (manualHealth) {
    metricsInput  = manualHealth;
    metricsSource = "manual";
  }

  const gmv  = metricsInput ? computeGmvReadiness(metricsInput, metricsSource) : null;
  const skus = gmv ? classifySkusForGmv(products) : null;

  const scoreColor = !gmv ? "text-reaper-dim" :
    gmv.score >= 80 ? "text-reaper-green" :
    gmv.score >= 50 ? "text-reaper-orange" :
                      "text-reaper-red";

  const signalColors = gmv ? {
    scale: { bg: "bg-[#001409]", border: "border-reaper-green",  text: "text-reaper-green",  badge: "safe"     as const },
    hold:  { bg: "bg-[#0d0800]", border: "border-reaper-orange", text: "text-reaper-orange", badge: "warning"  as const },
    pause: { bg: "bg-[#0d0000]", border: "border-reaper-red",    text: "text-reaper-red",    badge: "critical" as const },
  }[gmv.budgetSignal] : null;

  return (
    <div className="p-6 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
          {shop.shop_name} · {shop.tiktok_handle}
        </div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">GMV MAX READINESS</h1>
        <p className="text-reaper-muted text-sm mt-1">
          GMV Max is only as good as your shop health. Add any products — TikTok, AliExpress, or manual — and get an instant readiness verdict.
        </p>
      </div>

      {/* ── NO METRICS STATE ── */}
      {!metricsInput && (
        <Card accent="orange" className="p-5 mb-4">
          <SectionLabel>⚡ Set Your Shop Health</SectionLabel>
          <p className="text-[11px] text-reaper-dim mb-4">
            No TikTok sync data yet. Enter your current metrics manually to unlock the readiness score.
            You can find these in TikTok Seller Center → Account Health.
          </p>
          <ManualHealthForm shopId={shop.id} existing={manualHealth} />
        </Card>
      )}

      {/* ── READINESS SCORE + BLOCKERS (only when metrics exist) ── */}
      {gmv && signalColors && skus && (
        <>
          {/* Manual metrics banner */}
          {metricsSource === "manual" && (
            <div className="mb-4 bg-[#001422] border border-sky-600 rounded-lg px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="info">MANUAL METRICS</Badge>
                <span className="font-mono-dm text-[10px] text-sky-400">
                  Score based on your self-reported health data
                </span>
              </div>
              <button
                className="font-mono-dm text-[8px] tracking-wider text-sky-400 hover:text-sky-300"
                onClick={() => {}}
              >
                UPDATE →
              </button>
            </div>
          )}

          {/* Hero row */}
          <div className="grid grid-cols-[280px_1fr] gap-4 mb-4">
            {/* Score card */}
            <Card
              accent={gmv.ready ? "green" : gmv.score >= 50 ? "orange" : "red"}
              className="p-5 flex flex-col items-center justify-center gap-3 text-center"
            >
              <div className="font-mono-dm text-[8px] tracking-[3px] text-reaper-dim">READINESS SCORE</div>
              <div className={`font-display text-7xl leading-none ${scoreColor}`}>{gmv.score}</div>
              <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim">/ 100</div>
              <Badge
                variant={gmv.ready ? "safe" : gmv.score >= 50 ? "warning" : "critical"}
                pulse={!gmv.ready}
                className="mt-1"
              >
                {gmv.ready ? "✓ READY FOR GMV MAX" : "✗ NOT READY"}
              </Badge>
              {!gmv.ready && gmv.wastedSpend > 0 && (
                <div className="mt-2 w-full rounded border border-reaper-red bg-[#0a0000] px-3 py-2.5">
                  <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim mb-0.5">EST. WASTED SPEND</div>
                  <div className="font-display text-3xl text-reaper-red">${gmv.wastedSpend.toLocaleString()}</div>
                  <div className="font-mono-dm text-[8px] text-reaper-dim">per month at current health</div>
                </div>
              )}
            </Card>

            {/* Blockers / all clear */}
            <Card accent={gmv.ready ? "green" : "red"} className="p-5">
              {gmv.ready ? (
                <div className="flex flex-col justify-center h-full gap-4">
                  <SectionLabel>✓ All Systems Go</SectionLabel>
                  <div className="grid grid-cols-3 gap-3">
                    <CheckBadge label="SPS" value={metricsInput!.sps_computed.toFixed(1)} target={`≥${GMV_SPS_MIN}`} pass />
                    <CheckBadge label="OTD" value={`${metricsInput!.on_time_delivery_rate.toFixed(1)}%`} target={`≥${GMV_OTD_MIN}%`} pass />
                    <CheckBadge label="Refund" value={`${metricsInput!.refund_rate.toFixed(1)}%`} target={`<${GMV_REFUND_MAX}%`} pass />
                  </div>
                  <p className="text-reaper-muted text-sm">
                    Your shop health is strong. Launch GMV Max and let TikTok&apos;s algorithm work on a solid foundation.
                  </p>
                </div>
              ) : (
                <>
                  <SectionLabel>💀 Fix These Before Launching GMV Max</SectionLabel>
                  <div className="flex flex-col gap-3 mt-2">
                    {gmv.blockers.map((b) => (
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
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      {metricsInput!.sps_computed >= GMV_SPS_MIN && (
                        <CheckBadge label="SPS"    value={metricsInput!.sps_computed.toFixed(1)}               target={`≥${GMV_SPS_MIN}`}    pass />
                      )}
                      {metricsInput!.on_time_delivery_rate >= GMV_OTD_MIN && (
                        <CheckBadge label="OTD"    value={`${metricsInput!.on_time_delivery_rate.toFixed(1)}%`} target={`≥${GMV_OTD_MIN}%`}   pass />
                      )}
                      {metricsInput!.refund_rate < GMV_REFUND_MAX && (
                        <CheckBadge label="Refund" value={`${metricsInput!.refund_rate.toFixed(1)}%`}           target={`<${GMV_REFUND_MAX}%`} pass />
                      )}
                    </div>
                  </div>
                </>
              )}
            </Card>
          </div>

          {/* SKU Selector */}
          <Card className="p-5 mb-4">
            <SectionLabel>SKU Selector — Which Products to Run GMV Max On</SectionLabel>
            <p className="text-[11px] text-reaper-dim mb-4">
              Run ≥{GMV_CVR_HERO}% CVR · Test {GMV_CVR_TEST}–{GMV_CVR_HERO}% CVR · Skip &lt;{GMV_CVR_TEST}% CVR.
              Add your AliExpress or manual products below to include them in this analysis.
            </p>
            <div className="grid grid-cols-3 gap-4">
              <SkuCol title="RUN GMV MAX" count={skus.run.length} color="green" products={skus.run} />
              <SkuCol title="TEST CAREFULLY" count={skus.test.length} color="orange" products={skus.test} />
              <SkuCol title="DON'T RUN" count={skus.skip.length} color="red" products={skus.skip} />
            </div>
          </Card>

          {/* Budget Signal + Creator Scorer */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <Card className={`p-5 border ${signalColors.border} ${signalColors.bg}`}>
              <SectionLabel>Budget Signal</SectionLabel>
              <div className="flex items-center gap-3 mt-3 mb-4">
                <div className={`font-display text-5xl leading-none ${signalColors.text}`}>
                  {gmv.budgetSignal.toUpperCase()}
                </div>
                <Badge variant={signalColors.badge}>GMV MAX BUDGET</Badge>
              </div>
              <p className="text-[12px] text-reaper-muted leading-relaxed mb-4">{gmv.budgetReason}</p>
              <div className="flex flex-col gap-2">
                <SignalRule signal="scale" active={gmv.budgetSignal === "scale"}
                  label="Scale budget when:"
                  desc={`SPS ≥${GMV_SPS_MIN} + OTD ≥${GMV_OTD_MIN}% + Refund <${GMV_REFUND_MAX}% + score ≥85`}
                />
                <SignalRule signal="hold" active={gmv.budgetSignal === "hold"}
                  label="Hold budget when:"
                  desc="All checks pass but score 50–84. Run conservatively."
                />
                <SignalRule signal="pause" active={gmv.budgetSignal === "pause"}
                  label="Pause budget when:"
                  desc="Any blocker is failing. Every dollar spent is wasted."
                />
              </div>
            </Card>

            <Card className="p-5">
              <SectionLabel>Creator Content Scorer</SectionLabel>
              <p className="text-[11px] text-reaper-dim mb-4">
                Authorize top-converting affiliates — GMV Max amplifies their shoppable videos.
              </p>
              {affiliates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                  <div className="text-3xl">📹</div>
                  <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim">NO AFFILIATES YET</div>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {affiliates.map((a, i) => {
                    const gmvScore = Math.min(100, Math.round((a.total_revenue_attributed / Math.max(affiliates[0].total_revenue_attributed, 1)) * 100));
                    return (
                      <div key={a.id} className="flex items-center gap-3 py-2 border-b border-reaper-border last:border-b-0">
                        <div className="font-display text-lg text-reaper-dim w-5 text-right">{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="font-mono-dm text-[10px] text-reaper-text truncate">@{a.creator_handle}</div>
                          <div className="font-mono-dm text-[8px] text-reaper-dim mt-0.5">
                            ${a.total_revenue_attributed.toLocaleString()} attributed
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1 bg-reaper-bg3 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${gmvScore >= 70 ? "bg-reaper-green" : gmvScore >= 40 ? "bg-reaper-orange" : "bg-reaper-red"}`}
                              style={{ width: `${gmvScore}%` }}
                            />
                          </div>
                          <Badge variant={a.status === "active" ? "safe" : a.status === "at_risk" ? "warning" : "ghost"} className="text-[7px]">
                            {a.status === "active" ? "AUTHORIZE" : a.status === "at_risk" ? "AT RISK" : "CHURNED"}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ── PRODUCT CATALOG (always visible) ── */}
      <Card className="p-5">
        <SectionLabel>Your Product Catalog</SectionLabel>
        <p className="text-[11px] text-reaper-dim mb-4">
          Add any product — from TikTok Shop, AliExpress dropshipping, or anything you sell.
          Set the CVR and Reaper includes it in the GMV Max analysis above.
        </p>
        <ProductCatalog shopId={shop.id} products={products} />
      </Card>

      {/* ── UPDATE MANUAL HEALTH (visible when already saved) ── */}
      {metricsSource === "manual" && manualHealth && (
        <Card accent="orange" className="p-5 mt-4">
          <SectionLabel>⚡ Update Shop Health</SectionLabel>
          <ManualHealthForm shopId={shop.id} existing={manualHealth} />
        </Card>
      )}
    </div>
  );
}

// ── SUB-COMPONENTS ───────────────────────────────

function CheckBadge({ label, value, target, pass }: {
  label: string; value: string; target: string; pass: boolean;
}) {
  return (
    <div className={`rounded border p-2.5 text-center ${pass ? "bg-[#001409] border-reaper-green" : "bg-[#0a0000] border-reaper-red"}`}>
      <div className={`font-display text-2xl leading-none ${pass ? "text-reaper-green" : "text-reaper-red"}`}>{value}</div>
      <div className="font-mono-dm text-[8px] tracking-wider text-reaper-dim mt-1 uppercase">{label}</div>
      <div className="font-mono-dm text-[8px] text-reaper-dim mt-0.5">target {target}</div>
    </div>
  );
}

function SkuCol({ title, count, color, products }: {
  title: string; count: number; color: "green" | "orange" | "red"; products: Product[];
}) {
  const colors = {
    green:  { dot: "bg-reaper-green",  label: "text-reaper-green",  row: "bg-[#001409] border-reaper-green",  cvr: "text-reaper-green"  },
    orange: { dot: "bg-reaper-orange", label: "text-reaper-orange", row: "bg-[#0d0800] border-reaper-orange", cvr: "text-reaper-orange" },
    red:    { dot: "bg-reaper-red",    label: "text-reaper-red",    row: "bg-reaper-bg3 border-reaper-border", cvr: "text-reaper-red"    },
  }[color];

  const SOURCE_ICON: Record<string, string> = { tiktok: "", manual: "✏", aliexpress: "🛒" };

  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2 h-2 rounded-full ${colors.dot}`} />
        <span className={`font-mono-dm text-[9px] tracking-[2px] ${colors.label}`}>
          {title} · {count}
        </span>
      </div>
      {products.length === 0 ? (
        <div className="rounded border border-reaper-border bg-reaper-bg3 p-3 text-[11px] text-reaper-dim text-center">
          None
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {products.slice(0, 6).map((p) => (
            <div key={p.id} className={`flex items-center justify-between rounded border px-3 py-2 ${colors.row}`}>
              <div className="flex-1 min-w-0 mr-2">
                <div className="text-[11px] text-reaper-text truncate">{p.name}</div>
                {p.source !== "tiktok" && (
                  <div className="font-mono-dm text-[7px] text-reaper-dim">{SOURCE_ICON[p.source]} {p.source}</div>
                )}
              </div>
              <div className="flex items-baseline gap-1 shrink-0">
                <span className={`font-display text-lg leading-none ${colors.cvr}`}>{p.cvr_30d.toFixed(1)}%</span>
                <span className="font-mono-dm text-[8px] text-reaper-dim">CVR</span>
              </div>
            </div>
          ))}
          {products.length > 6 && (
            <div className="text-[10px] text-reaper-dim text-center pt-1">+{products.length - 6} more</div>
          )}
        </div>
      )}
    </div>
  );
}

function SignalRule({ signal, label, desc, active }: {
  signal: "scale" | "hold" | "pause"; label: string; desc: string; active: boolean;
}) {
  const c = { scale: "text-reaper-green", hold: "text-reaper-orange", pause: "text-reaper-red" }[signal];
  return (
    <div className={`rounded border border-reaper-border p-2.5 transition-all ${active ? "bg-reaper-bg3" : "opacity-40"}`}>
      <div className={`font-mono-dm text-[8px] tracking-wider uppercase mb-0.5 ${active ? c : "text-reaper-dim"}`}>
        {active && "▶ "}{label}
      </div>
      <div className="text-[10px] text-reaper-dim">{desc}</div>
    </div>
  );
}
