import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { Card, Badge, SectionLabel } from "@/components/ui";
import type { Alert } from "@/types";

export default async function AlertsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: shop } = await supabase
    .from("shops").select("id, shop_name").eq("user_id", authUser.id)
    .eq("is_active", true).single();
  if (!shop) redirect("/dashboard");

  const { data: alerts } = await supabase
    .from("alerts_log").select("*").eq("shop_id", shop.id)
    .order("created_at", { ascending: false }).limit(100);

  const all      = (alerts ?? []) as Alert[];
  const active   = all.filter((a) => !a.dismissed_at && !a.actioned_at);
  const actioned = all.filter((a) => a.actioned_at);
  const critical = active.filter((a) => a.severity === "critical");
  const warnings = active.filter((a) => a.severity === "warning");

  // Alert type breakdown
  const byType: Record<string, number> = {};
  active.forEach((a) => { byType[a.alert_type] = (byType[a.alert_type] ?? 0) + 1; });

  return (
    <div className="p-6 max-w-5xl">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
          {shop.shop_name}
        </div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">REAPER ALERTS</h1>
        <p className="text-reaper-muted text-sm mt-1">
          Every alert includes a fix script. Act on critical alerts within 48 hours.
        </p>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Critical",  val: critical.length, color: "text-reaper-red",    bg: "bg-[#0d0000] border-reaper-red"    },
          { label: "Warnings",  val: warnings.length, color: "text-reaper-orange", bg: "bg-[#0d0800] border-reaper-orange" },
          { label: "Actioned",  val: actioned.length, color: "text-reaper-green",  bg: "bg-[#001409] border-reaper-green"  },
          { label: "Total (30D)",val: all.length,      color: "text-reaper-muted", bg: "bg-reaper-bg2 border-reaper-border"},
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-lg border p-4 ${bg}`}>
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-1">{label}</div>
            <div className={`font-display text-4xl leading-none ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_260px] gap-4">
        {/* Alert feed */}
        <div className="flex flex-col gap-4">
          {critical.length > 0 && (
            <Card accent="red" className="p-4">
              <SectionLabel>
                Critical Alerts
                <Badge variant="critical" pulse>{critical.length}</Badge>
              </SectionLabel>
              <AlertFeed alerts={critical} />
            </Card>
          )}

          {warnings.length > 0 && (
            <Card accent="orange" className="p-4">
              <SectionLabel>Warnings</SectionLabel>
              <AlertFeed alerts={warnings} />
            </Card>
          )}

          {actioned.length > 0 && (
            <Card className="p-4">
              <SectionLabel>Actioned</SectionLabel>
              <div className="flex flex-col gap-2">
                {actioned.slice(0, 10).map((a) => (
                  <div key={a.id} className="flex items-center gap-3 py-2 border-b border-reaper-border last:border-b-0">
                    <Badge variant="safe">DONE</Badge>
                    <span className="text-xs text-reaper-dim flex-1">{a.title}</span>
                    <span className="font-mono-dm text-[9px] text-reaper-dim">
                      {a.actioned_at ? new Date(a.actioned_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {active.length === 0 && (
            <Card className="p-12 text-center">
              <div className="text-5xl mb-3">✅</div>
              <div className="font-display text-2xl tracking-wide text-reaper-green">ALL CLEAR</div>
              <div className="text-sm text-reaper-dim mt-1">No active alerts. Shop health is stable.</div>
            </Card>
          )}
        </div>

        {/* Sidebar: alert type breakdown */}
        <div className="flex flex-col gap-3">
          <Card className="p-4">
            <SectionLabel>Alert Types</SectionLabel>
            <div className="flex flex-col gap-2 mt-1">
              {Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between py-1.5 border-b border-reaper-border last:border-b-0">
                  <span className="font-mono-dm text-[9px] tracking-wider text-reaper-dim uppercase">
                    {type.replace(/_/g, " ")}
                  </span>
                  <Badge variant={count > 1 ? "critical" : "warning"}>{count}</Badge>
                </div>
              ))}
              {Object.keys(byType).length === 0 && (
                <div className="text-xs text-reaper-dim py-2">No active alert types</div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <SectionLabel>Response Guide</SectionLabel>
            <div className="flex flex-col gap-3 mt-1">
              {[
                { sev: "CRITICAL", desc: "Act within 48 hours. Revenue impact is imminent.", color: "text-reaper-red" },
                { sev: "WARNING",  desc: "Act within 7 days. Threshold approaching.",         color: "text-reaper-orange" },
                { sev: "INFO",     desc: "Monitor only. No immediate action required.",       color: "text-sky-400" },
              ].map(({ sev, desc, color }) => (
                <div key={sev}>
                  <div className={`font-mono-dm text-[9px] tracking-wider font-bold mb-0.5 ${color}`}>{sev}</div>
                  <div className="text-[11px] text-reaper-dim leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 bg-[#0d0000] border-reaper-red">
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-2">💀 PRO TIP</div>
            <p className="text-xs text-reaper-muted leading-relaxed">
              Every alert has a <span className="text-reaper-text font-semibold">fix script</span> — click
              &quot;Fix Script&quot; on any alert to see exact steps you can take today.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
