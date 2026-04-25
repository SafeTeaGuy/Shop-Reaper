import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SkuTable } from "@/components/dashboard/SkuTable";
import { Card, Badge, SectionLabel } from "@/components/ui";
import type { Product } from "@/types";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: shop } = await supabase
    .from("shops").select("id, shop_name").eq("user_id", authUser.id)
    .eq("is_active", true).single();
  if (!shop) redirect("/dashboard");

  const { data: products } = await supabase
    .from("products").select("*").eq("shop_id", shop.id)
    .order("revenue_30d", { ascending: false });

  const all = (products ?? []) as Product[];
  const dying   = all.filter((p) => p.status === "dying");
  const heroes  = all.filter((p) => p.status === "hero");
  const warning = all.filter((p) => p.status === "warning");

  const totalRevenue    = all.reduce((s, p) => s + p.revenue_30d, 0);
  const heroRevenue     = heroes.reduce((s, p) => s + p.revenue_30d, 0);
  const dyingRevenueLost = dying.reduce((s, p) => s + p.revenue_30d * 0.6, 0); // est. recoverable

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
          {shop.shop_name}
        </div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">SKU AUTOPSY</h1>
        <p className="text-reaper-muted text-sm mt-1">
          Weekly analysis of every SKU. Kill dead weight. Double down on heroes.
        </p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total SKUs",   val: all.length,          color: "text-reaper-text",   bg: "bg-reaper-bg2 border-reaper-border" },
          { label: "Hero SKUs",    val: heroes.length,       color: "text-reaper-green",  bg: "bg-[#001409] border-reaper-green" },
          { label: "Dying SKUs",   val: dying.length,        color: "text-reaper-red",    bg: "bg-[#0d0000] border-reaper-red" },
          { label: "At Warning",   val: warning.length,      color: "text-reaper-orange", bg: "bg-[#0d0800] border-reaper-orange" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-lg border p-4 ${bg}`}>
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-1">{label}</div>
            <div className={`font-display text-4xl leading-none ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-4">
        {/* Main table */}
        <Card className="p-4">
          <SectionLabel>All SKUs — Sorted by Risk</SectionLabel>
          <SkuTable products={all} />
        </Card>

        {/* Sidebar */}
        <div className="flex flex-col gap-3">
          {/* Revenue breakdown */}
          <Card className="p-4">
            <SectionLabel>Revenue Split</SectionLabel>
            <div className="flex flex-col gap-3 mt-1">
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-mono-dm text-[9px] text-reaper-dim">HERO SKUS</span>
                  <span className="text-reaper-green font-semibold text-sm">${heroRevenue.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-reaper-bg3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-reaper-green rounded-full"
                    style={{ width: `${totalRevenue > 0 ? (heroRevenue / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between items-baseline mb-1">
                  <span className="font-mono-dm text-[9px] text-reaper-dim">DYING SKUS</span>
                  <span className="text-reaper-red font-semibold text-sm">
                    ${dying.reduce((s, p) => s + p.revenue_30d, 0).toLocaleString()}
                  </span>
                </div>
                <div className="h-1.5 bg-reaper-bg3 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-reaper-red rounded-full"
                    style={{ width: `${totalRevenue > 0 ? (dying.reduce((s, p) => s + p.revenue_30d, 0) / totalRevenue) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Recoverable revenue */}
          {dying.length > 0 && (
            <Card accent="red" className="p-4 bg-[#0d0000]">
              <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-2">🔪 OPPORTUNITY</div>
              <div className="font-display text-3xl text-reaper-green mb-1">
                ~${Math.round(dyingRevenueLost / 100) * 100 .toLocaleString()}
              </div>
              <div className="font-mono-dm text-[9px] text-reaper-dim mb-3">Est. recoverable per month by killing dying SKUs and reallocating affiliate traffic</div>
              <div className="text-[11px] text-reaper-muted leading-relaxed">
                Archive {dying.length} dying SKU{dying.length > 1 ? "s" : ""} and redirect all affiliate traffic to your hero SKU{heroes.length > 1 ? "s" : ""}.
              </div>
            </Card>
          )}

          {/* CVR guide */}
          <Card className="p-4">
            <SectionLabel>CVR Reference</SectionLabel>
            <div className="flex flex-col gap-2 mt-1">
              {[
                { range: "> 3.0%",    label: "HERO",    desc: "Double affiliate traffic",   color: "text-reaper-green"  },
                { range: "2.0–3.0%",  label: "MONITOR", desc: "Watch weekly",               color: "text-reaper-muted"  },
                { range: "1.0–2.0%",  label: "WARNING", desc: "Optimize or cut",            color: "text-reaper-orange" },
                { range: "< 1.0%",    label: "DYING",   desc: "Archive immediately",        color: "text-reaper-red"    },
              ].map(({ range, label, desc, color }) => (
                <div key={label} className="flex items-center gap-3 py-1.5 border-b border-reaper-border last:border-b-0">
                  <div className={`font-mono-dm text-[9px] font-bold min-w-[52px] ${color}`}>{range}</div>
                  <div>
                    <div className={`font-mono-dm text-[8px] tracking-wider ${color}`}>{label}</div>
                    <div className="text-[10px] text-reaper-dim">{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Hero SKUs highlight */}
          {heroes.length > 0 && (
            <Card accent="green" className="p-4 bg-[#001409]">
              <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-green mb-2">⭐ HERO SKUS</div>
              {heroes.slice(0, 3).map((p) => (
                <div key={p.id} className="flex justify-between items-center py-1.5 border-b border-reaper-border last:border-b-0">
                  <span className="text-xs text-reaper-text truncate flex-1 mr-2">{p.name}</span>
                  <span className="font-display text-lg text-reaper-green">{p.cvr_30d.toFixed(1)}%</span>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
