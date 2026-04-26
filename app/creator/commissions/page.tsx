import { Card, Badge, SectionLabel } from "@/components/ui";

interface ShopPartner {
  id: string;
  name: string;
  emoji: string;
  sps: number;
  skus: number;
  commission_rate: number;
  status: "healthy" | "warning" | "at_risk";
  earnings_30d: number;
  health_pct: number;
}

const PARTNERS: ShopPartner[] = [
  { id:"1", name:"VitalBoost Nutrition", emoji:"💊", sps:4.5, skus:12, commission_rate:20, status:"healthy", earnings_30d:820, health_pct:90 },
  { id:"2", name:"FitCore Apparel",      emoji:"🏃", sps:4.1, skus:18, commission_rate:18, status:"healthy", earnings_30d:640, health_pct:82 },
  { id:"3", name:"GlowUp Beauty",        emoji:"✨", sps:3.8, skus:34, commission_rate:15, status:"healthy", earnings_30d:580, health_pct:76 },
  { id:"4", name:"Grindset Merch Co.",   emoji:"👕", sps:2.9, skus:5,  commission_rate:12, status:"warning", earnings_30d:420, health_pct:58 },
  { id:"5", name:"HomeLux Studio",       emoji:"🏠", sps:2.4, skus:22, commission_rate:8,  status:"at_risk", earnings_30d:180, health_pct:28 },
];

const STATUS_CONFIG = {
  healthy:  { label: "HEALTHY",  badge: "safe"     as const, bar: "bg-reaper-green"  },
  warning:  { label: "WARNING",  badge: "warning"  as const, bar: "bg-reaper-orange" },
  at_risk:  { label: "AT RISK",  badge: "critical" as const, bar: "bg-reaper-red"    },
};

export default function CommissionsPage() {
  const totalEarnings = PARTNERS.reduce((s, p) => s + p.earnings_30d, 0);
  const atRisk        = PARTNERS.filter(p => p.status === "at_risk").length;
  const avgRate       = (PARTNERS.reduce((s, p) => s + p.commission_rate, 0) / PARTNERS.length).toFixed(1);
  const bestShop      = [...PARTNERS].sort((a, b) => b.commission_rate - a.commission_rate)[0];

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">TikTok Shop Affiliate</div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">COMMISSION TRACKER</h1>
        <p className="text-reaper-muted text-sm mt-1">Track rates, earnings, and shop health before you promote.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "30D Earnings",    val: `$${totalEarnings.toLocaleString()}`, color: "text-reaper-green",  bg: "bg-[#001409] border-[rgba(0,184,90,0.25)]"  },
          { label: "Pending Payout",  val: "$640",                              color: "text-reaper-gold",   bg: "bg-[#0d0c00] border-[rgba(201,150,10,0.25)]" },
          { label: "Avg Rate",        val: `${avgRate}%`,                       color: "text-[#00C8B8]",     bg: "bg-[#001410] border-[rgba(0,200,184,0.25)]"  },
          { label: "At-Risk Shops",   val: atRisk,                              color: "text-reaper-red",    bg: "bg-[#0d0000] border-[rgba(217,26,15,0.25)]"  },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-lg border p-4 ${bg}`}>
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-1">{label}</div>
            <div className={`font-display text-4xl leading-none ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_280px] gap-5">
        {/* Partner list */}
        <Card accent="gold" className="p-4">
          <SectionLabel className="text-reaper-gold">Active Shop Partnerships</SectionLabel>
          <div className="flex flex-col">
            {PARTNERS.map((shop) => {
              const cfg = STATUS_CONFIG[shop.status];
              return (
                <div
                  key={shop.id}
                  className="flex items-center gap-3 py-3 border-b border-reaper-border last:border-b-0 hover:bg-reaper-bg3 hover:-mx-4 hover:px-4 rounded transition-all cursor-pointer"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-md bg-reaper-bg3 border border-reaper-border2 flex items-center justify-center text-lg flex-shrink-0">
                    {shop.emoji}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-reaper-text truncate">{shop.name}</div>
                    <div className="font-mono-dm text-[9px] text-reaper-dim mt-0.5">
                      SPS {shop.sps} · {shop.skus} SKUs · ${shop.earnings_30d}/mo
                    </div>
                  </div>

                  {/* Rate */}
                  <div className={`font-display text-2xl leading-none ${
                    shop.commission_rate >= 15 ? "text-reaper-green" :
                    shop.commission_rate >= 10 ? "text-reaper-gold" : "text-reaper-muted"
                  }`}>
                    {shop.commission_rate}%
                  </div>

                  {/* Health */}
                  <div className="flex flex-col items-end gap-1.5 min-w-[80px]">
                    <Badge variant={cfg.badge}>{cfg.label}</Badge>
                    <div className="w-12 h-1 bg-reaper-bg4 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${cfg.bar}`}
                        style={{ width: `${shop.health_pct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Sidebar */}
        <div className="flex flex-col gap-4">
          {/* At-risk warning */}
          <Card accent="red" className="p-4 bg-[#0d0000]">
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-2">⚠ REAPER WARNING</div>
            <p className="text-xs text-reaper-muted leading-relaxed mb-3">
              <span className="text-reaper-text font-semibold">HomeLux Studio</span> SPS at 2.4 — already throttled.
              Your promotions are getting{" "}
              <span className="text-reaper-red font-semibold">40% fewer impressions.</span>
            </p>
            <p className="text-xs text-reaper-dim leading-relaxed">
              Promoting a throttled shop hurts your own creator metrics. Pause this shop until SPS recovers above 3.0.
            </p>
          </Card>

          {/* Best opportunity */}
          <Card accent="green" className="p-4 bg-[#001409]">
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-green mb-2">💡 BEST OPPORTUNITY</div>
            <div className="font-display text-xl tracking-wider text-reaper-green mb-1">{bestShop.name}</div>
            <p className="text-xs text-reaper-muted leading-relaxed">
              SPS {bestShop.sps} · {bestShop.commission_rate}% rate · Healthy shop, top rates, trending in your demo. Prioritize for next 3 videos.
            </p>
          </Card>

          {/* Rate benchmarks */}
          <Card className="p-4">
            <SectionLabel>Rate Benchmarks — Fashion</SectionLabel>
            <div className="flex flex-col gap-0">
              {[
                { label: "Top creator rate", val: "22%", color: "text-reaper-green" },
                { label: "Your avg rate",    val: `${avgRate}%`, color: "text-reaper-gold" },
                { label: "Category avg",     val: "9%",  color: "text-reaper-muted" },
              ].map(({ label, val, color }) => (
                <div key={label} className="flex justify-between items-baseline py-2.5 border-b border-reaper-border last:border-b-0">
                  <span className="text-xs text-reaper-muted">{label}</span>
                  <span className={`font-display text-2xl ${color}`}>{val}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
