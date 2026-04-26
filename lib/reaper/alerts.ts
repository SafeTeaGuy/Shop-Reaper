import type { ShopMetrics, Alert, AlertType, AlertSeverity, SpsResult } from "@/types";

interface AlertTemplate {
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  getMessage: (metrics: ShopMetrics, sps: SpsResult) => string;
  getFixScript: (metrics: ShopMetrics, sps: SpsResult) => string;
  policyRef: string;
  getRevenueAtRisk: (metrics: ShopMetrics) => number;
  shouldFire: (metrics: ShopMetrics, sps: SpsResult) => boolean;
}

const ALERT_TEMPLATES: AlertTemplate[] = [
  {
    type: "sps_drift",
    severity: "critical",
    title: "SPS Score Critical — Affiliate Throttle Imminent",
    shouldFire: (m, sps) => sps.score < 3.0,
    getMessage: (m, sps) =>
      `SPS at ${sps.score} — threshold breach imminent. Affiliate visibility throttle activates at 2.5. Your ${m.affiliate_count} affiliates will lose 40% impression allocation if this isn't resolved within 48 hours.`,
    getFixScript: (m, sps) =>
      `1. Identify orders with carrier delays — prioritize manual tracking updates today\n2. Contact your top 5 affiliates with a status update — keep them warm\n3. Respond to every open negative review within 24 hours using this template:\n   "I see your review. I'm personally making this right. Please DM me for immediate replacement or refund."\n4. Check on_time_delivery_rate — this is your most impactful lever at ${m.on_time_delivery_rate}%`,
    policyRef: "TikTok Shop Policy: Seller Performance Score (SPS) — threshold 3.0 for standard visibility",
    getRevenueAtRisk: (m) => m.revenue_30d * 0.4,
  },
  {
    type: "delivery_floor",
    severity: "critical",
    title: "On-Time Delivery Below Policy Floor",
    shouldFire: (m) => m.on_time_delivery_rate < 85,
    getMessage: (m) =>
      `On-time delivery at ${m.on_time_delivery_rate.toFixed(1)}% — TikTok's minimum is 85%. You are ${(85 - m.on_time_delivery_rate).toFixed(1)} points below threshold. Visibility penalty activates automatically at Day 7 of sustained non-compliance.`,
    getFixScript: (m) =>
      `IMMEDIATE (today):\n1. Audit your ${m.pending_orders} pending orders — identify which have no tracking update\n2. Switch delayed shipments to 2-day fulfillment options where possible\n3. Set your order processing cutoff 2 hours earlier to give warehouse buffer\n4. Contact affected buyers proactively with tracking info\n\nSYSTEM FIX:\n5. Review carrier performance by route — flag underperforming carriers\n6. Consider TikTok's own fulfillment program for high-velocity SKUs`,
    policyRef: "TikTok Shop Policy: Logistics Performance — on-time delivery rate minimum 85%",
    getRevenueAtRisk: (m) => m.revenue_30d * 0.25,
  },
  {
    type: "refund_spike",
    severity: "warning",
    title: "Refund Rate Approaching Flag Threshold",
    shouldFire: (m) => m.refund_rate >= 7,
    getMessage: (m) =>
      `Refund rate at ${m.refund_rate.toFixed(1)}% — TikTok flags accounts at 10%. You have approximately ${Math.floor((10 - m.refund_rate) / 0.5)} weeks of runway before automatic flag. Most refunds are product-description mismatch.`,
    getFixScript: () =>
      `1. Pull your top-refunded SKUs — check if descriptions match actual product\n2. Update thumbnails and descriptions for any SKU with >5% refund rate\n3. Add a size/fit guide if selling apparel — reduces expectation mismatch refunds significantly\n4. Review negative reviews for language indicating "not as described" — this is your signal\n5. Consider removing SKUs where refund rate exceeds CVR gains`,
    policyRef: "TikTok Shop Policy: After-Sales Performance — refund rate flag threshold 10%",
    getRevenueAtRisk: (m) => m.revenue_30d * 0.1,
  },
  {
    type: "violation_count",
    severity: "warning",
    title: "Active Policy Violations — Account Review Risk",
    shouldFire: (m) => m.violations_count >= 2,
    getMessage: (m) =>
      `${m.violations_count} active policy violations on file. TikTok initiates formal account review at 3 violations. Adding new affiliates while violations are open accelerates review likelihood.`,
    getFixScript: (m) =>
      `1. Open Seller Center → Compliance → Policy Violations — read each violation reason\n2. For content violations: remove flagged listings immediately, re-submit with corrections\n3. For fulfillment violations: document your remediation steps in the dispute form\n4. DO NOT add new affiliates until violation count drops to 0\n5. Submit a voluntary compliance report if violations are more than 14 days old — shows good faith`,
    policyRef: "TikTok Shop Policy: Seller Compliance — violations trigger formal review at threshold",
    getRevenueAtRisk: (m) => m.revenue_30d * 0.5,
  },
  {
    type: "affiliate_throttle",
    severity: "critical",
    title: "Affiliate Visibility Throttle Detected",
    shouldFire: (m, sps) => sps.score < 2.5,
    getMessage: (m, sps) =>
      `SPS at ${sps.score} has triggered automatic affiliate visibility throttle. Your ${m.affiliate_count} affiliate partners are receiving 40% fewer impressions on promotions. This is invisible to them — they'll see lower conversions and attribute it to content performance.`,
    getFixScript: (m) =>
      `URGENT — contact affiliates before they churn:\n1. DM your top ${Math.min(m.affiliate_count, 10)} affiliates today: "Platform-side issue affecting delivery metrics. Working on fix — your content is solid, impressions will recover."\n2. Offer a temporary commission bump of 2-3% to keep them engaged while you fix the root cause\n3. Focus all affiliate traffic on your hero SKUs (highest CVR) — maximize every reduced impression\n4. Fix the root cause (delivery rate / review rate) — throttle lifts automatically once SPS recovers above 3.0`,
    policyRef: "TikTok Shop Policy: SPS below 2.5 triggers automatic affiliate reach reduction",
    getRevenueAtRisk: (m) => m.revenue_30d * 0.4,
  },
];

export function generateAlerts(
  shopId: string,
  metrics: ShopMetrics,
  sps: SpsResult,
  existingAlerts: Alert[]
): Omit<Alert, "id" | "created_at">[] {
  const recentAlertTypes = new Set(
    existingAlerts
      .filter((a) => {
        const age = Date.now() - new Date(a.created_at).getTime();
        return age < 1000 * 60 * 60 * 6; // suppress same alert within 6 hours
      })
      .map((a) => a.alert_type)
  );

  return ALERT_TEMPLATES
    .filter((t) => t.shouldFire(metrics, sps) && !recentAlertTypes.has(t.type))
    .map((t) => ({
      shop_id: shopId,
      alert_type: t.type,
      severity: t.severity,
      title: t.title,
      message: t.getMessage(metrics, sps),
      fix_script: t.getFixScript(metrics, sps),
      policy_ref: t.policyRef,
      revenue_at_risk: t.getRevenueAtRisk(metrics),
      metric_value: getMetricValue(t.type, metrics, sps),
      metric_threshold: getMetricThreshold(t.type),
      sent_sms: false,
      sent_email: false,
      actioned_at: null,
      dismissed_at: null,
    }));
}

function getMetricValue(type: AlertType, metrics: ShopMetrics, sps: SpsResult): number | null {
  switch (type) {
    case "sps_drift":         return sps.score;
    case "delivery_floor":    return metrics.on_time_delivery_rate;
    case "refund_spike":      return metrics.refund_rate;
    case "violation_count":   return metrics.violations_count;
    case "affiliate_throttle": return sps.score;
    default: return null;
  }
}

function getMetricThreshold(type: AlertType): number | null {
  switch (type) {
    case "sps_drift":         return 3.0;
    case "delivery_floor":    return 85;
    case "refund_spike":      return 10;
    case "violation_count":   return 3;
    case "affiliate_throttle": return 2.5;
    default: return null;
  }
}
