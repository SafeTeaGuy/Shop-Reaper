import { Card, Badge, SectionLabel } from "@/components/ui";

// ── TYPES ─────────────────────────────────────
interface Trend {
  id: string;
  name: string;
  status: "hot" | "rising" | "peak" | "dead";
  uses: string;
  cvr_lift: number;
  desc: string;
  categories: string[];
  spark: number[];
  window_hours: number | null;
}

// ── MOCK DATA (replace with TikTok API when live) ────
const TRENDS: Trend[] = [
  {
    id: "1",
    name: "Original Sound — Trap Beat 808",
    status: "hot",
    uses: "2.4M",
    cvr_lift: 42,
    desc: "Aggressive bass drop + product reveal converting at 4.2% CVR across fashion and fitness. Hook window: first 1.5 seconds.",
    categories: ["Fashion", "Fitness", "Streetwear"],
    spark: [20,35,42,55,80,110,148,190,230,245],
    window_hours: 18,
  },
  {
    id: "2",
    name: "POV: You found the best [product]",
    status: "hot",
    uses: "1.8M",
    cvr_lift: 38,
    desc: "POV format with direct address camera work. High trust signal. Works best for skincare, supplements, home products. Avg watch time: 87%.",
    categories: ["Beauty", "Home", "Wellness"],
    spark: [40,55,70,85,90,110,130,150,162,180],
    window_hours: 24,
  },
  {
    id: "3",
    name: "Lo-fi Chill Hop Beat #4471",
    status: "rising",
    uses: "890K",
    cvr_lift: 28,
    desc: "Emerging sound in home decor and kitchen niche. Still early — 3x growth this week. Get in before saturation.",
    categories: ["Home", "Kitchen", "Lifestyle"],
    spark: [10,12,15,20,28,44,68,95,120,160],
    window_hours: 48,
  },
  {
    id: "4",
    name: "That Girl Morning Routine",
    status: "peak",
    uses: "12M",
    cvr_lift: -8,
    desc: "Oversaturated in wellness/fitness. CVR dropping — avoid unless you have a truly unique angle.",
    categories: ["Wellness", "Fitness", "Beauty"],
    spark: [180,200,220,240,245,240,230,210,190,175],
    window_hours: null,
  },
  {
    id: "5",
    name: "Unboxing ASMR Format",
    status: "peak",
    uses: "8.2M",
    cvr_lift: -12,
    desc: "Past peak but viable for premium products. CVR down 18% this month. Only use with high-AOV items ($50+).",
    categories: ["Luxury", "Tech", "Beauty"],
    spark: [200,210,215,210,200,185,170,155,140,130],
    window_hours: null,
  },
];

const STATUS_CONFIG = {
  hot:    { label: "🔥 HOT",     border: "border-l-reaper-red",    bg: "bg-[#0a0000]", badge: "bg-[#1C0000] text-reaper-red border-reaper-red" },
  rising: { label: "📈 RISING",  border: "border-l-reaper-orange", bg: "bg-[#0a0800]", badge: "bg-[#1C0E00] text-reaper-orange border-reaper-orange" },
  peak:   { label: "⚠ PEAK",    border: "border-l-reaper-gold",   bg: "bg-[#0a0800]", badge: "bg-[#1a1000] text-reaper-gold border-reaper-gold" },
  dead:   { label: "💀 DEAD",    border: "border-l-reaper-dim",    bg: "bg-reaper-bg2", badge: "bg-reaper-bg3 text-reaper-dim border-reaper-border" },
};

function SparkLine({ data }: { data: number[] }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-6">
      {data.map((v, i) => (
        <div
          key={i}
          className="w-2 rounded-sm bg-[#00C8B8] opacity-60"
          style={{ height: `${Math.max(4, (v / max) * 24)}px` }}
        />
      ))}
    </div>
  );
}

export default function TrendsPage() {
  const hot    = TRENDS.filter(t => t.status === "hot");
  const rising = TRENDS.filter(t => t.status === "rising");
  const peak   = TRENDS.filter(t => t.status === "peak");

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
            Real-Time · TikTok Shop
          </div>
          <h1 className="font-display text-3xl tracking-wider text-reaper-text">TREND SCANNER</h1>
          <p className="text-reaper-muted text-sm mt-1">
            Sounds and formats converting right now. Updated every 4 hours.
          </p>
        </div>
        <div className="flex gap-2 items-start">
          <select className="bg-reaper-bg3 border border-reaper-border2 text-reaper-muted font-mono-dm text-[9px] px-3 py-2 rounded focus:outline-none focus:border-reaper-dim">
            <option>All Categories</option>
            <option>Fashion</option>
            <option>Beauty</option>
            <option>Fitness</option>
            <option>Home</option>
          </select>
          <button className="bg-[#00C8B8] text-reaper-bg font-mono-dm text-[9px] tracking-[1.5px] px-3 py-2 rounded font-bold hover:shadow-[0_0_14px_rgba(0,200,184,0.4)] transition-all">
            ↻ REFRESH
          </button>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: "Trending Now",   val: TRENDS.length,  color: "text-[#00C8B8]", bg: "bg-[#001410] border-[rgba(0,200,184,0.25)]" },
          { label: "On Fire",        val: hot.length,     color: "text-reaper-red", bg: "bg-[#0d0000] border-[rgba(217,26,15,0.25)]" },
          { label: "Near Peak",      val: peak.length,    color: "text-reaper-gold", bg: "bg-[#0d0800] border-[rgba(201,150,10,0.25)]" },
          { label: "Avg CVR Lift",   val: "+34%",         color: "text-reaper-green", bg: "bg-[#001409] border-[rgba(0,184,90,0.25)]" },
        ].map(({ label, val, color, bg }) => (
          <div key={label} className={`rounded-lg border p-4 ${bg}`}>
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-1">{label}</div>
            <div className={`font-display text-4xl leading-none ${color}`}>{val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Hot + Rising */}
        <div>
          <SectionLabel>🔥 Exploding Now</SectionLabel>
          <div className="flex flex-col gap-3 mb-6">
            {[...hot, ...rising].map((trend) => {
              const cfg = STATUS_CONFIG[trend.status];
              return (
                <div
                  key={trend.id}
                  className={`rounded-lg border border-reaper-border border-l-2 p-4 ${cfg.bg} ${cfg.border} transition-all hover:border-reaper-border2 cursor-pointer`}
                >
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <div className="text-sm font-bold text-reaper-text flex-1">{trend.name}</div>
                    <span className={`font-mono-dm text-[7.5px] tracking-[1.5px] px-2 py-0.5 rounded border ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                    <span className="font-mono-dm text-[9px] text-reaper-dim">{trend.uses} uses</span>
                  </div>

                  <p className="text-xs text-reaper-muted leading-relaxed mb-3">{trend.desc}</p>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {trend.categories.map(c => (
                      <span key={c} className="font-mono-dm text-[8px] px-2 py-0.5 rounded-full border border-reaper-border2 text-reaper-muted">
                        {c}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <SparkLine data={trend.spark} />
                      <div className="font-mono-dm text-[8px] text-reaper-dim mt-1">7-day trend</div>
                    </div>
                    <div className="text-right">
                      {trend.window_hours && (
                        <div className="font-mono-dm text-[9px] text-reaper-orange mb-1">
                          ⏱ {trend.window_hours}hr window
                        </div>
                      )}
                      <div className={`font-mono-dm text-[9px] font-bold ${trend.cvr_lift > 0 ? "text-reaper-green" : "text-reaper-red"}`}>
                        {trend.cvr_lift > 0 ? "+" : ""}{trend.cvr_lift}% CVR
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Near Peak + Recommendations */}
        <div>
          <SectionLabel>⚠ Near Saturation</SectionLabel>
          <div className="flex flex-col gap-3 mb-5">
            {peak.map((trend) => (
              <div key={trend.id} className="rounded-lg border border-[#2a1400] border-l-2 border-l-reaper-orange p-4 bg-[#0d0800]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="text-sm font-bold text-reaper-text flex-1">{trend.name}</div>
                  <span className="font-mono-dm text-[7.5px] tracking-[1.5px] px-2 py-0.5 rounded border text-reaper-gold border-reaper-gold bg-[#1a1000]">
                    ⚠ PEAK
                  </span>
                </div>
                <p className="text-xs text-reaper-muted leading-relaxed mb-3">{trend.desc}</p>
                <div className="flex items-end justify-between">
                  <SparkLine data={trend.spark} />
                  <div className="font-mono-dm text-[9px] text-reaper-red font-bold">{trend.cvr_lift}% CVR</div>
                </div>
              </div>
            ))}
          </div>

          {/* Reaper recommendation */}
          <Card accent="none" className="p-4 mb-4 bg-[#001410] border-[rgba(0,200,184,0.25)]">
            <div className="font-mono-dm text-[8px] tracking-[2px] text-[#00C8B8] mb-2">🎯 REAPER RECOMMENDATION</div>
            <p className="text-xs text-reaper-muted leading-relaxed">
              Based on your niche (fashion/fitness),{" "}
              <span className="text-reaper-text font-semibold">Trap Beat 808</span> is your highest-leverage sound right now.
              Post in the next{" "}
              <span className="text-[#00C8B8] font-semibold">18 hours</span> before weekend saturation hits.
            </p>
          </Card>

          {/* Best posting windows */}
          <Card className="p-4">
            <SectionLabel>📅 Best Posting Windows</SectionLabel>
            <div className="flex flex-col gap-0">
              {[
                { time: "Today 6–8 PM",      quality: "BEST", color: "text-reaper-green"  },
                { time: "Tomorrow 7–9 AM",   quality: "GOOD", color: "text-reaper-gold"   },
                { time: "Tomorrow 12–2 PM",  quality: "OK",   color: "text-reaper-muted"  },
              ].map(({ time, quality, color }) => (
                <div key={time} className="flex items-center justify-between py-2.5 border-b border-reaper-border last:border-b-0">
                  <span className="text-xs text-reaper-muted">{time}</span>
                  <span className={`font-mono-dm text-[9px] font-bold ${color}`}>{quality}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
