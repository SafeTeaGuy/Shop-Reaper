"use client";
import type { Product } from "@/types";
import { Badge, cn } from "@/components/ui";

interface SkuTableProps {
  products: Product[];
}

const STATUS_CONFIG = {
  dying:   { badge: "critical" as const, label: "DYING",   color: "text-reaper-red" },
  warning: { badge: "warning"  as const, label: "WARNING", color: "text-reaper-orange" },
  monitor: { badge: "ghost"    as const, label: "WATCH",   color: "text-reaper-muted" },
  hero:    { badge: "safe"     as const, label: "HERO",    color: "text-reaper-green" },
};

export function SkuTable({ products }: SkuTableProps) {
  const sorted = [...products].sort((a, b) => {
    const order = { dying: 0, warning: 1, monitor: 2, hero: 3 };
    return order[a.status] - order[b.status];
  });

  return (
    <div>
      {/* Summary badges */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {(["dying","warning","hero"] as const).map((s) => {
          const count = products.filter((p) => p.status === s).length;
          if (!count) return null;
          return (
            <div key={s} className="flex items-center gap-1.5">
              <Badge variant={STATUS_CONFIG[s].badge}>
                {count} {STATUS_CONFIG[s].label}
              </Badge>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-reaper-border overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[1fr_80px_90px_80px_90px] gap-2 px-4 py-2.5 bg-reaper-bg3 border-b border-reaper-border">
          {["Product", "CVR", "30D Rev", "Refunds", "Status"].map((h) => (
            <div key={h} className="font-mono-dm text-[8.5px] tracking-[2px] text-reaper-dim uppercase">
              {h}
            </div>
          ))}
        </div>

        {/* Rows */}
        {sorted.map((p, i) => {
          const cfg = STATUS_CONFIG[p.status];
          return (
            <div
              key={p.id}
              className={cn(
                "grid grid-cols-[1fr_80px_90px_80px_90px] gap-2 px-4 py-3",
                "border-b border-reaper-border last:border-b-0",
                "hover:bg-reaper-bg3 transition-colors duration-150",
                p.status === "dying" && "bg-[#0a0000]"
              )}
            >
              {/* Name */}
              <div>
                <div className="text-sm font-medium text-reaper-text truncate">{p.name}</div>
                <div className="font-mono-dm text-[9px] text-reaper-dim">{p.tiktok_sku_id.slice(0, 12)}…</div>
              </div>

              {/* CVR */}
              <div className="flex items-center">
                <span className={cn(
                  "font-display text-xl leading-none",
                  p.cvr_30d < 1 ? "text-reaper-red" :
                  p.cvr_30d < 2 ? "text-reaper-orange" :
                  "text-reaper-green"
                )}>
                  {p.cvr_30d.toFixed(1)}%
                </span>
              </div>

              {/* Revenue */}
              <div className="flex items-center">
                <span className="text-sm text-reaper-muted">
                  ${p.revenue_30d.toLocaleString()}
                </span>
              </div>

              {/* Refunds */}
              <div className="flex items-center">
                <span className={cn(
                  "text-sm",
                  p.refund_count_30d > 10 ? "text-reaper-red" :
                  p.refund_count_30d > 5  ? "text-reaper-orange" :
                  "text-reaper-dim"
                )}>
                  {p.refund_count_30d}
                </span>
              </div>

              {/* Status */}
              <div className="flex items-center">
                <Badge variant={cfg.badge}>{cfg.label}</Badge>
              </div>
            </div>
          );
        })}

        {products.length === 0 && (
          <div className="text-center py-8 text-reaper-dim text-sm">
            No products synced yet
          </div>
        )}
      </div>

      {/* Reaper verdict for dying SKUs */}
      {sorted.filter((p) => p.status === "dying").length > 0 && (
        <div className="mt-3 bg-[#0d0000] border border-[#2a0000] rounded-lg p-3">
          <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-1.5">
            🔪 REAPER VERDICT
          </div>
          <p className="text-xs text-reaper-muted leading-relaxed">
            {sorted.filter((p) => p.status === "dying").map((p) => p.name).join(", ")}{" "}
            {sorted.filter((p) => p.status === "dying").length === 1 ? "is" : "are"} net-negative after TikTok fees.
            Archive and redirect affiliate traffic to your hero SKUs.{" "}
            {sorted.find((p) => p.status === "hero") && (
              <span className="text-reaper-green font-medium">
                {sorted.find((p) => p.status === "hero")!.name} at{" "}
                {sorted.find((p) => p.status === "hero")!.cvr_30d.toFixed(1)}% CVR is your best allocation.
              </span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}
