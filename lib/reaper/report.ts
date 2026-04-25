import Anthropic from "@anthropic-ai/sdk";
import type { DashboardData } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface WeeklyReport {
  week_of: string;
  shop_name: string;
  executive_summary: string;
  risk_level: "critical" | "warning" | "stable" | "excellent";
  sps_change: number;
  key_metrics: {
    label: string;
    value: string;
    change: string;
    direction: "up" | "down" | "flat";
  }[];
  actions: {
    priority: "critical" | "warning" | "opportunity";
    title: string;
    body: string;
  }[];
  forecast: {
    best_case: string;
    worst_case: string;
    recommended: string;
  };
  affiliate_intel: string;
  generated_at: string;
}

export async function generateWeeklyReport(
  current: DashboardData,
  previousSps: number
): Promise<WeeklyReport> {
  const { shop, metrics, sps, products, affiliates, alerts } = current;
  const spsChange = parseFloat((sps.score - previousSps).toFixed(2));
  const dyingSkus = products.filter((p) => p.status === "dying");
  const heroSkus  = products.filter((p) => p.status === "hero");
  const atRiskAffiliates = affiliates.filter((a) => a.status === "at_risk");

  const prompt = `You are the Reaper — Shop Reaper's AI analyst. Write a brutally honest, data-driven weekly report for a TikTok Shop seller. Be specific, use exact numbers, and don't sugarcoat. Every sentence should be actionable or informative.

LIVE SHOP DATA:
- Shop: ${shop.shop_name} (${shop.tiktok_handle})
- SPS: ${sps.score} (was ${previousSps} last week, change: ${spsChange > 0 ? "+" : ""}${spsChange})
- Risk: ${sps.risk.toUpperCase()}
- On-Time Delivery: ${metrics.on_time_delivery_rate.toFixed(1)}% (floor: 85%)
- Refund Rate: ${metrics.refund_rate.toFixed(1)}% (flag: 10%)
- Violations: ${metrics.violations_count} (review at 3)
- 30D Revenue: $${metrics.revenue_30d.toLocaleString()}
- Orders: ${metrics.orders_30d}
- Pending: ${metrics.pending_orders}
- Affiliates: ${affiliates.length} total, ${atRiskAffiliates.length} at risk
- Dying SKUs: ${dyingSkus.map(p => `${p.name} (${p.cvr_30d}% CVR)`).join(", ") || "none"}
- Hero SKUs: ${heroSkus.map(p => `${p.name} (${p.cvr_30d}% CVR)`).join(", ") || "none"}
- Active Alerts: ${alerts.filter(a => !a.actioned_at && !a.dismissed_at).length} (${alerts.filter(a => a.severity === "critical" && !a.actioned_at).length} critical)

Return ONLY a JSON object with this exact structure — no markdown, no preamble:
{
  "executive_summary": "2-3 sentences. Brutal honesty. Specific numbers.",
  "risk_level": "critical|warning|stable|excellent",
  "key_metrics": [
    { "label": "string", "value": "string", "change": "string", "direction": "up|down|flat" }
  ],
  "actions": [
    { "priority": "critical|warning|opportunity", "title": "string", "body": "2-3 sentence specific action with exact steps" }
  ],
  "forecast": {
    "best_case": "string — if all actions taken this week",
    "worst_case": "string — if nothing done",
    "recommended": "string — the single most important thing to do first"
  },
  "affiliate_intel": "1-2 sentences specifically about affiliate health and what to do about it"
}`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .replace(/```json|```/g, "")
    .trim();

  const parsed = JSON.parse(raw);
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return {
    ...parsed,
    week_of: weekAgo.toLocaleDateString("en-US", { month: "long", day: "numeric" }),
    shop_name: shop.shop_name,
    sps_change: spsChange,
    generated_at: now.toISOString(),
  };
}
