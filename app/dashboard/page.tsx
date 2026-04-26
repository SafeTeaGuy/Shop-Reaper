import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeSps } from "@/lib/tiktok/client";
import { SpsGauge } from "@/components/dashboard/SpsGauge";
import { AlertFeed } from "@/components/dashboard/AlertFeed";
import { SkuTable } from "@/components/dashboard/SkuTable";
import { Card, Badge, Button, SectionLabel } from "@/components/ui";
import Link from "next/link";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; upgraded?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const params = await searchParams;

  // Fetch shop + latest metrics
  const { data: shop } = await supabase
    .from("shops").select("*").eq("user_id", authUser.id)
    .eq("is_active", true).order("connected_at", { ascending: false }).limit(1).single();

  if (!shop) {
    return <NoShopConnected />;
  }

  const [metricsRes, alertsRes, productsRes] = await Promise.all([
    supabase.from("metrics").select("*").eq("shop_id", shop.id)
      .order("date", { ascending: false }).limit(1).single(),
    supabase.from("alerts_log").select("*").eq("shop_id", shop.id)
      .is("dismissed_at", null).order("created_at", { ascending: false }).limit(30),
    supabase.from("products").select("*").eq("shop_id", shop.id)
      .order("revenue_30d", { ascending: false }).limit(20),
  ]);

  const metrics = metricsRes.data;
  const alerts  = alertsRes.data ?? [];
  const products = productsRes.data ?? [];

  if (!metrics) {
    return <SyncingState shopId={shop.id} shopName={shop.shop_name} />;
  }

  const sps = computeSps({
    negative_review_rate:        metrics.negative_review_rate,
    return_rate_non_buyer_fault: metrics.return_rate_non_buyer_fault,
    cancel_rate_seller_fault:    metrics.cancel_rate_seller_fault,
    on_time_delivery_rate:       metrics.on_time_delivery_rate,
    im_dissatisfaction_rate:     metrics.im_dissatisfaction_rate,
    aftersales_handling_hours:   metrics.aftersales_handling_hours,
  });

  const criticalCount = alerts.filter((a) => a.severity === "critical" && !a.actioned_at).length;

  return (
    <div className="p-6 max-w-7xl">
      {/* Toast banners */}
      {params.connected && (
        <div className="mb-4 bg-[#001409] border border-reaper-green rounded-lg px-4 py-3 text-sm text-reaper-green">
          ✅ TikTok Shop connected. First sync running in the background — metrics will appear shortly.
        </div>
      )}
      {params.upgraded && (
        <div className="mb-4 bg-[#0d0000] border border-reaper-red rounded-lg px-4 py-3 text-sm text-reaper-red">
          💀 You're on Reaper. Reaper Coach and SMS alerts are now active.
        </div>
      )}

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
            {shop.shop_name} · {shop.tiktok_handle}
          </div>
          <h1 className="font-display text-3xl tracking-wider text-reaper-text">MISSION CONTROL</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="font-mono-dm text-[8px] tracking-wider text-reaper-dim">
            Last sync: {shop.last_synced_at
              ? new Date(shop.last_synced_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "Pending…"}
          </div>
          <form action="/api/reaper/sync" method="POST">
            <input type="hidden" name="shopId" value={shop.id} />
            <Button size="sm" variant="ghost">↻ Sync Now</Button>
          </form>
        </div>
      </div>

      {/* Hero row — SPS + stats */}
      <div className="grid grid-cols-[auto_1fr] gap-4 mb-4">
        {/* SPS Card */}
        <Card accent={sps.risk === "safe" ? "green" : sps.risk === "warning" ? "orange" : "red"} className="p-5 flex flex-col items-center gap-2">
          <SpsGauge score={sps.score} risk={sps.risk} size={160} />
          {criticalCount > 0 && (
            <Badge variant="critical" pulse className="mt-1">
              {criticalCount} CRITICAL ALERT{criticalCount > 1 ? "S" : ""}
            </Badge>
          )}
        </Card>

        {/* Metric cards */}
        <div className="grid grid-cols-3 gap-3">
          <MetricCard
            label="On-Time Delivery"
            value={`${metrics.on_time_delivery_rate.toFixed(1)}%`}
            target="Target: ≥85%"
            status={metrics.on_time_delivery_rate >= 85 ? "safe" : metrics.on_time_delivery_rate >= 75 ? "warning" : "critical"}
          />
          <MetricCard
            label="Refund Rate"
            value={`${metrics.refund_rate.toFixed(1)}%`}
            target="Flag at: 10%"
            status={metrics.refund_rate < 5 ? "safe" : metrics.refund_rate < 8 ? "warning" : "critical"}
          />
          <MetricCard
            label="Violations"
            value={String(metrics.violations_count)}
            target="Review at: 3"
            status={metrics.violations_count === 0 ? "safe" : metrics.violations_count < 3 ? "warning" : "critical"}
          />
          <MetricCard
            label="30D Revenue"
            value={`$${metrics.revenue_30d.toLocaleString()}`}
            target={`${metrics.orders_30d} orders`}
            status="safe"
          />
          <MetricCard
            label="Pending Orders"
            value={String(metrics.pending_orders)}
            target={metrics.pending_orders > 20 ? "High — review needed" : "Normal"}
            status={metrics.pending_orders > 30 ? "warning" : "safe"}
          />
          <MetricCard
            label="Affiliates"
            value={String(metrics.affiliate_count)}
            target={sps.risk !== "safe" ? "At risk of throttle" : "Healthy"}
            status={sps.risk === "critical" || sps.risk === "restricted" ? "warning" : "safe"}
          />
        </div>
      </div>

      {/* SPS component breakdown */}
      <Card className="p-4 mb-4">
        <SectionLabel>SPS Component Breakdown</SectionLabel>
        <div className="grid grid-cols-3 gap-3 mt-2">
          {[
            { key: "negative_review_rate",        label: "Neg. Review Rate", val: metrics.negative_review_rate,        threshold: 2,   invert: true  },
            { key: "return_rate_non_buyer_fault",  label: "Return Rate",      val: metrics.return_rate_non_buyer_fault, threshold: 5,   invert: true  },
            { key: "cancel_rate_seller_fault",     label: "Cancel Rate",      val: metrics.cancel_rate_seller_fault,    threshold: 1,   invert: true  },
            { key: "on_time_delivery_rate",        label: "On-Time Delivery", val: metrics.on_time_delivery_rate,       threshold: 85,  invert: false },
            { key: "im_dissatisfaction_rate",      label: "IM Dissatisfaction",val: metrics.im_dissatisfaction_rate,   threshold: 10,  invert: true  },
            { key: "aftersales_handling_hours",    label: "Aftersales (hrs)", val: metrics.aftersales_handling_hours,   threshold: 48,  invert: true  },
          ].map(({ label, val, threshold, invert, key }) => {
            const bad = invert ? val > threshold : val < threshold;
            const isWeakest = sps.weakest_metric === key;
            return (
              <div key={key} className={`rounded p-2.5 border ${bad ? "bg-[#0a0000] border-reaper-red" : "bg-reaper-bg3 border-reaper-border"}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono-dm text-[8px] tracking-wider text-reaper-dim uppercase">{label}</span>
                  {isWeakest && <Badge variant="critical" className="text-[7px]">WEAKEST</Badge>}
                </div>
                <div className={`font-display text-2xl leading-none ${bad ? "text-reaper-red" : "text-reaper-green"}`}>
                  {val.toFixed(1)}{invert || key === "on_time_delivery_rate" ? "%" : " hrs"}
                </div>
                <div className="font-mono-dm text-[8px] text-reaper-dim mt-0.5">
                  {invert ? "Max" : "Min"}: {threshold}{key === "aftersales_handling_hours" ? "h" : "%"}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Alerts + SKUs */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <SectionLabel>
            Active Alerts
            {criticalCount > 0 && (
              <Badge variant="critical" pulse className="ml-1">{criticalCount}</Badge>
            )}
          </SectionLabel>
          <AlertFeed alerts={alerts} />
          {alerts.length > 5 && (
            <Link href="/dashboard/alerts" className="block mt-3 text-center font-mono-dm text-[9px] tracking-wider text-reaper-dim hover:text-reaper-muted transition-colors">
              View all {alerts.length} alerts →
            </Link>
          )}
        </Card>

        <Card className="p-4">
          <SectionLabel>SKU Autopsy</SectionLabel>
          <SkuTable products={products.slice(0, 8)} />
          {products.length > 8 && (
            <Link href="/dashboard/products" className="block mt-3 text-center font-mono-dm text-[9px] tracking-wider text-reaper-dim hover:text-reaper-muted transition-colors">
              View all {products.length} SKUs →
            </Link>
          )}
        </Card>
      </div>
    </div>
  );
}

// ── SUB COMPONENTS ────────────────────────────

function MetricCard({ label, value, target, status }: {
  label: string; value: string; target: string;
  status: "safe" | "warning" | "critical";
}) {
  const colors = {
    safe:     { bg: "bg-[#001409]", border: "border-reaper-green", text: "text-reaper-green" },
    warning:  { bg: "bg-[#0d0800]", border: "border-reaper-orange", text: "text-reaper-orange" },
    critical: { bg: "bg-[#0d0000]", border: "border-reaper-red",    text: "text-reaper-red" },
  };
  const c = colors[status];
  return (
    <div className={`rounded-lg border p-3 ${c.bg} ${c.border}`}>
      <div className="font-mono-dm text-[8.5px] tracking-[2px] text-reaper-dim uppercase mb-1.5">{label}</div>
      <div className={`font-display text-3xl leading-none ${c.text}`}>{value}</div>
      <div className="font-mono-dm text-[9px] text-reaper-dim mt-1">{target}</div>
    </div>
  );
}

function NoShopConnected() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8">
      <div className="text-6xl mb-4 animate-float">💀</div>
      <h2 className="font-display text-4xl tracking-widest text-reaper-text mb-2">CONNECT YOUR SHOP</h2>
      <p className="text-reaper-muted text-sm mb-6 max-w-sm">
        Link your TikTok Shop to start monitoring your SPS score, alerts, and SKU health in real time.
      </p>
      <Link href="/api/tiktok/connect">
        <Button variant="primary" size="lg">Connect TikTok Shop →</Button>
      </Link>
    </div>
  );
}

function SyncingState({ shopId, shopName }: { shopId: string; shopName: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center p-8">
      <div className="text-6xl mb-4">⏳</div>
      <h2 className="font-display text-3xl tracking-widest text-reaper-text mb-2">SYNCING {shopName.toUpperCase()}</h2>
      <p className="text-reaper-muted text-sm mb-6 max-w-sm">
        First sync is running. This takes 30–60 seconds. Refresh in a moment.
      </p>
      <form action="/api/reaper/sync" method="POST">
        <input type="hidden" name="shopId" value={shopId} />
        <Button variant="ghost">↻ Check Again</Button>
      </form>
    </div>
  );
}
