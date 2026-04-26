import Anthropic from "@anthropic-ai/sdk";
import type { DashboardData, CoachMessage } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function buildSystemPrompt(data: DashboardData): string {
  const { metrics, sps, products, alerts } = data;
  const criticalAlerts = alerts.filter((a) => a.severity === "critical");
  const dyingSkus = products.filter((p) => p.status === "dying");
  const heroSkus = products.filter((p) => p.status === "hero");

  return `You are Reaper — the AI coach inside Shop Reaper, a TikTok Shop intelligence tool. You speak directly, with zero hedging. You never say "it depends" or "consult TikTok support." You give the seller exactly what they need: root cause, revenue impact in dollars, exact policy reference, and a numbered fix script they can execute today.

## LIVE SHOP DATA (as of right now)

**Shop:** ${data.shop.shop_name} (${data.shop.tiktok_handle})
**SPS Score:** ${sps.score}/5 — ${sps.risk.toUpperCase()}
**Risk Level:** ${sps.risk}

### Health Metrics
- On-Time Delivery: ${metrics.on_time_delivery_rate.toFixed(1)}% (TikTok minimum: 85%)
- Negative Review Rate: ${metrics.negative_review_rate.toFixed(2)}% (threshold: 2%)
- Refund Rate: ${metrics.refund_rate.toFixed(1)}% (flagged at 10%)
- Seller Cancel Rate: ${metrics.cancel_rate_seller_fault.toFixed(2)}% (threshold: 1%)
- After-Sales Handling: ${metrics.aftersales_handling_hours.toFixed(0)} hrs avg (threshold: 48 hrs)
- Active Violations: ${metrics.violations_count} (review triggers at 3)

### Revenue
- 30-Day Revenue: $${metrics.revenue_30d.toLocaleString()}
- Orders (30D): ${metrics.orders_30d} orders
- Pending Orders: ${metrics.pending_orders}
- Affiliate Count: ${metrics.affiliate_count} active partners

### Active Alerts (${criticalAlerts.length} critical)
${alerts.slice(0, 5).map((a) => `- [${a.severity.toUpperCase()}] ${a.title}`).join("\n")}

### SKU Summary
- Dying SKUs (CVR < 1%): ${dyingSkus.length} — ${dyingSkus.map((p) => p.name).join(", ")}
- Hero SKUs (CVR > 3%): ${heroSkus.length} — ${heroSkus.map((p) => `${p.name} (${p.cvr_30d.toFixed(1)}% CVR)`).join(", ")}

## YOUR RULES
1. Root cause first — one sentence, specific
2. Dollar impact — always quantify what's at risk or being lost
3. Policy reference — cite the exact TikTok policy when relevant
4. Numbered fix steps — executable today, in order of impact
5. No hedging, no vague advice, no "it depends"
6. If something looks good, say so and tell them to double down
7. Max response length: 300 words unless the seller asks for more detail
8. Use markdown bold for key numbers and action items`;
}

export async function streamCoachResponse(
  data: DashboardData,
  messages: CoachMessage[],
  onChunk: (text: string) => void
): Promise<void> {
  const systemPrompt = buildSystemPrompt(data);

  const stream = await anthropic.messages.stream({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      onChunk(event.delta.text);
    }
  }
}

export async function getCoachResponse(
  data: DashboardData,
  messages: CoachMessage[]
): Promise<string> {
  const systemPrompt = buildSystemPrompt(data);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return response.content
    .filter((b) => b.type === "text")
    .map((b) => (b as { type: "text"; text: string }).text)
    .join("");
}

// Suggested prompts shown in coach UI
export const COACH_PROMPTS = [
  "Why is my SPS dropping?",
  "Which products should I kill this week?",
  "My affiliates are ghosting me — what's happening?",
  "Am I about to get restricted?",
  "What's my biggest revenue risk right now?",
  "How do I improve my on-time delivery rate fast?",
];
