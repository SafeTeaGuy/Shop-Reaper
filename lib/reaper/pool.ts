import Anthropic from "@anthropic-ai/sdk";
import type { PoolDeal, Product } from "@/types";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Returns pool deals sorted by AI match score against the seller's catalog.
// Non-matching deals are appended at the end in original order.
export async function rankDealsByMatch(
  deals: PoolDeal[],
  products: Product[]
): Promise<PoolDeal[]> {
  if (!deals.length || !products.length) return deals;

  const catalogSummary = products
    .slice(0, 20)
    .map((p) => `${p.name}${p.category ? ` (${p.category})` : ""}`)
    .join(", ");

  const dealList = deals
    .map((d, i) => `${i}: ${d.title} [tags: ${d.ai_match_tags.join(", ") || "none"}]`)
    .join("\n");

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 256,
      messages: [{
        role: "user",
        content: `You are ranking inventory pool deals by relevance to a seller's product catalog.

Seller catalog: ${catalogSummary}

Pool deals (index: title [tags]):
${dealList}

Return ONLY a JSON array of deal indices sorted from most relevant to least relevant to this seller's catalog. Example: [2,0,3,1]
No explanation. JSON only.`,
      }],
    });

    const raw = (msg.content[0] as { type: string; text: string }).text.trim();
    const indices: number[] = JSON.parse(raw.match(/\[[\d,\s]+\]/)?.[0] ?? "[]");

    if (!indices.length) return deals;

    const ranked: PoolDeal[] = [];
    const seen = new Set<number>();
    for (const i of indices) {
      if (i >= 0 && i < deals.length) { ranked.push(deals[i]); seen.add(i); }
    }
    // Append any deals not included in the ranking
    deals.forEach((d, i) => { if (!seen.has(i)) ranked.push(d); });
    return ranked;
  } catch {
    // Fall back to original order on any error
    return deals;
  }
}

// Compute the total collected for a deal from its contributions
export function computePoolProgress(
  targetAmount: number,
  totalCollected: number
): { pct: number; remaining: number; funded: boolean } {
  const pct = targetAmount > 0 ? Math.min(100, (totalCollected / targetAmount) * 100) : 0;
  return {
    pct: Math.round(pct * 10) / 10,
    remaining: Math.max(0, targetAmount - totalCollected),
    funded: totalCollected >= targetAmount,
  };
}
