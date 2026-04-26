import { redirect }       from "next/navigation";
import { createClient }   from "@/lib/supabase/server";
import { computeSps }     from "@/lib/tiktok/client";
import { Card, SectionLabel, Badge } from "@/components/ui";
import Link from "next/link";
import type { WeeklyReport } from "@/lib/reaper/report";

// Priority config
const PRIORITY = {
  critical:    { dot: "bg-reaper-red",    label: "CRITICAL",     border: "border-l-reaper-red"    },
  warning:     { dot: "bg-reaper-orange", label: "WARNING",      border: "border-l-reaper-orange" },
  opportunity: { dot: "bg-reaper-green",  label: "OPPORTUNITY",  border: "border-l-reaper-green"  },
};

export default async function ReportPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: shop } = await supabase
    .from("shops").select("*").eq("user_id", authUser.id).eq("is_active", true).single();
  if (!shop) redirect("/dashboard");

  // Get current + previous week metrics
  const [{ data: currentMetrics }, { data: prevMetrics }] = await Promise.all([
    supabase.from("metrics").select("*").eq("shop_id", shop.id)
      .order("date", { ascending: false }).limit(1).single(),
    supabase.from("metrics").select("sps_computed").eq("shop_id", shop.id)
      .order("date", { ascending: false }).range(6, 7).limit(1).single(),
  ]);

  // Check for cached report (regenerate weekly)
  const { data: cachedReport } = await supabase
    .from("weekly_reports")
    .select("*")
    .eq("shop_id", shop.id)
    .gte("generated_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
    .order("generated_at", { ascending: false })
    .limit(1)
    .single();

  let report: WeeklyReport | null = cachedReport?.report_json ?? null;

  // Generate fresh if no cache
  if (!report && currentMetrics) {
    try {
      const { generateWeeklyReport } = await import("@/lib/reaper/report");
      const sps = computeSps({
        negative_review_rate:        currentMetrics.negative_review_rate,
        return_rate_non_buyer_fault: currentMetrics.return_rate_non_buyer_fault,
        cancel_rate_seller_fault:    currentMetrics.cancel_rate_seller_fault,
        on_time_delivery_rate:       currentMetrics.on_time_delivery_rate,
        im_dissatisfaction_rate:     currentMetrics.im_dissatisfaction_rate,
        aftersales_handling_hours:   currentMetrics.aftersales_handling_hours,
      });

      const [{ data: alerts }, { data: products }, { data: affiliates }] = await Promise.all([
        supabase.from("alerts_log").select("*").eq("shop_id", shop.id).is("dismissed_at", null).limit(20),
        supabase.from("products").select("*").eq("shop_id", shop.id).limit(20),
        supabase.from("affiliates").select("*").eq("shop_id", shop.id).limit(50),
      ]);

      report = await generateWeeklyReport(
        { shop, metrics: currentMetrics, sps, alerts: alerts ?? [], products: products ?? [], affiliates: affiliates ?? [] },
        prevMetrics?.sps_computed ?? currentMetrics.sps_computed
      );

      // Cache it
      await supabase.from("weekly_reports").insert({
        shop_id:      shop.id,
        report_json:  report,
        generated_at: new Date().toISOString(),
      });
    } catch (err) {
      console.error("Report generation failed:", err);
    }
  }

  const spsChange = report?.sps_change ?? 0;

  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 px-6 pt-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="font-mono-dm text-[9px] tracking-[3px] text-[#9B59FF] uppercase">
              🤖 AI Weekly Report
            </div>
            <Badge variant="ghost" className="text-[#9B59FF] border-[rgba(155,89,255,0.3)] bg-[rgba(155,89,255,0.07)]">
              Claude-Generated
            </Badge>
          </div>
          <h1 className="font-display text-3xl tracking-wider text-reaper-text">
            Week of {report?.week_of ?? "This Week"}
          </h1>
          <div className="font-mono-dm text-[9px] text-reaper-dim mt-1">
            {shop.shop_name} ·{" "}
            {report?.generated_at
              ? `Generated ${new Date(report.generated_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : "Generating…"}
          </div>
        </div>
        <Link href="/dashboard">
          <button className="font-mono-dm text-[9px] tracking-wider text-reaper-dim border border-reaper-border px-3 py-2 rounded hover:border-reaper-border2 hover:text-reaper-muted transition-all">
            ← Back
          </button>
        </Link>
      </div>

      <div className="px-6 pb-12 flex flex-col gap-5">
        {!report ? (
          <Card className="p-12 text-center">
            <div className="text-4xl mb-3">🤖</div>
            <div className="font-display text-2xl tracking-wider text-reaper-text mb-2">GENERATING REPORT</div>
            <div className="text-sm text-reaper-dim">Claude is analyzing your shop data. This takes about 10 seconds.</div>
          </Card>
        ) : (
          <>
            {/* Executive Summary */}
            <Card className="p-5 bg-[#090012] border-[rgba(155,89,255,0.2)]">
              <SectionLabel className="text-[#9B59FF]">Executive Summary</SectionLabel>
              <p className="text-sm text-reaper-muted leading-relaxed">{report.executive_summary}</p>
            </Card>

            {/* Key stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: "SPS Change",
                  val: `${spsChange > 0 ? "+" : ""}${spsChange}`,
                  color: spsChange >= 0 ? "text-reaper-green" : "text-reaper-red",
                  bg:    spsChange >= 0 ? "bg-[#001409] border-[rgba(0,184,90,0.25)]" : "bg-[#0d0000] border-[rgba(217,26,15,0.25)]",
                },
                ...(report.key_metrics?.slice(0, 2).map((m) => ({
                  label: m.label,
                  val:   m.value,
                  color: m.direction === "up" ? "text-reaper-green" : m.direction === "down" ? "text-reaper-red" : "text-reaper-muted",
                  bg:    "bg-reaper-bg2 border-reaper-border",
                })) ?? []),
              ].map(({ label, val, color, bg }) => (
                <div key={label} className={`rounded-xl border p-4 ${bg}`}>
                  <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-1.5">{label}</div>
                  <div className={`font-display text-3xl leading-none ${color}`}>{val}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div>
              <SectionLabel>This Week&apos;s Actions</SectionLabel>
              <div className="flex flex-col gap-2.5">
                {report.actions?.map((action, i) => {
                  const cfg = PRIORITY[action.priority];
                  return (
                    <div key={i} className={`bg-reaper-bg2 border border-reaper-border border-l-2 rounded-xl p-4 ${cfg.border}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`} />
                        <div className="font-mono-dm text-[8px] tracking-wider" style={{ color: cfg.dot.includes("red") ? "var(--reaper-red)" : cfg.dot.includes("orange") ? "var(--reaper-orange)" : "var(--reaper-green)" }}>
                          {cfg.label}
                        </div>
                      </div>
                      <div className="text-sm font-bold text-reaper-text mb-1.5">{action.title}</div>
                      <div className="text-xs text-reaper-muted leading-relaxed">{action.body}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Affiliate Intel */}
            {report.affiliate_intel && (
              <Card className="p-4">
                <SectionLabel>Affiliate Intel</SectionLabel>
                <p className="text-sm text-reaper-muted leading-relaxed">{report.affiliate_intel}</p>
              </Card>
            )}

            {/* Forecast */}
            {report.forecast && (
              <Card className="p-5 bg-[#090012] border-[rgba(155,89,255,0.2)]">
                <SectionLabel className="text-[#9B59FF]">Next Week Forecast</SectionLabel>
                <div className="flex flex-col gap-3">
                  <div>
                    <div className="font-mono-dm text-[8px] text-reaper-green mb-1">✅ BEST CASE</div>
                    <div className="text-xs text-reaper-muted leading-relaxed">{report.forecast.best_case}</div>
                  </div>
                  <div>
                    <div className="font-mono-dm text-[8px] text-reaper-red mb-1">🔴 WORST CASE</div>
                    <div className="text-xs text-reaper-muted leading-relaxed">{report.forecast.worst_case}</div>
                  </div>
                  <div className="bg-[rgba(155,89,255,0.06)] border border-[rgba(155,89,255,0.15)] rounded-lg p-3">
                    <div className="font-mono-dm text-[8px] text-[#9B59FF] mb-1">💡 RECOMMENDED FIRST MOVE</div>
                    <div className="text-xs text-reaper-text leading-relaxed font-semibold">{report.forecast.recommended}</div>
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
