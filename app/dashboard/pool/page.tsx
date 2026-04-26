import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { rankDealsByMatch, computePoolProgress } from "@/lib/reaper/pool";
import { Card, Badge, SectionLabel } from "@/components/ui";
import { ProposePoolForm } from "@/components/dashboard/ProposePoolForm";
import type { PoolDeal, PoolMembership, PoolContribution, Product } from "@/types";

export default async function PoolPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: shop } = await supabase
    .from("shops").select("id, shop_name, tiktok_handle").eq("user_id", authUser.id)
    .eq("is_active", true).order("connected_at", { ascending: false }).limit(1).single();
  if (!shop) redirect("/dashboard");

  const [dealsRes, membershipsRes, contributionsRes, metricsRes, productsRes] = await Promise.all([
    supabase.from("pool_deals").select("*").eq("status", "open").order("created_at", { ascending: false }),
    supabase.from("pool_memberships").select("*").eq("user_id", authUser.id).eq("is_active", true),
    supabase.from("pool_contributions").select("*").eq("user_id", authUser.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("metrics").select("revenue_30d").eq("shop_id", shop.id).order("date", { ascending: false }).limit(1).single(),
    supabase.from("products").select("name, category").eq("shop_id", shop.id).limit(20),
  ]);

  const deals        = (dealsRes.data ?? []) as PoolDeal[];
  const memberships  = (membershipsRes.data ?? []) as PoolMembership[];
  const contributions = (contributionsRes.data ?? []) as PoolContribution[];
  const revenue30d   = (metricsRes.data?.revenue_30d ?? 0) as number;
  const products     = (productsRes.data ?? []) as Product[];

  const membershipByDeal = new Map(memberships.map((m) => [m.pool_deal_id, m]));
  const myDealIds        = new Set(memberships.map((m) => m.pool_deal_id));

  // AI-rank non-joined deals
  const nonJoined    = deals.filter((d) => !myDealIds.has(d.id));
  const rankedDeals  = await rankDealsByMatch(nonJoined, products);
  const joinedDeals  = deals.filter((d) => myDealIds.has(d.id));

  // Per-deal collected totals (from contributions ledger)
  const collectedByDeal = contributions.reduce<Record<string, number>>((acc, c) => {
    if (c.status === "collected") acc[c.pool_deal_id] = (acc[c.pool_deal_id] ?? 0) + c.amount;
    return acc;
  }, {});

  // Fetch member counts per deal
  const { data: memberCounts } = await supabase
    .from("pool_memberships")
    .select("pool_deal_id")
    .eq("is_active", true)
    .in("pool_deal_id", deals.map((d) => d.id));

  const countByDeal = (memberCounts ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.pool_deal_id] = (acc[r.pool_deal_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
          {shop.shop_name} · {shop.tiktok_handle}
        </div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">REAPER CO-OP</h1>
        <p className="text-reaper-muted text-sm mt-1">
          Pool a % of your monthly revenue with other sellers to hit AliExpress bulk minimums and unlock wholesale pricing.
        </p>
      </div>

      {/* Legal notice */}
      <div className="mb-6 bg-[#0d0800] border border-reaper-orange rounded-lg px-4 py-3 flex items-start gap-3">
        <span className="text-reaper-orange mt-0.5 shrink-0">⚠️</span>
        <p className="font-mono-dm text-[9px] text-reaper-orange leading-relaxed">
          CO-OP BETA — Contributions will be charged monthly via your saved payment method.
          Reaper purchases inventory on your behalf when the pool hits its target.
          This feature is in beta — contact support before joining if you have questions.
        </p>
      </div>

      {/* Your active memberships */}
      {joinedDeals.length > 0 && (
        <div className="mb-6">
          <SectionLabel>🏊 Your Active Pools</SectionLabel>
          <div className="grid grid-cols-1 gap-3 mt-2">
            {joinedDeals.map((deal) => {
              const membership = membershipByDeal.get(deal.id)!;
              const collected  = collectedByDeal[deal.id] ?? 0;
              const progress   = computePoolProgress(deal.target_amount, collected);
              const estimate   = Math.round(revenue30d * (membership.contribution_pct / 100));
              return (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  progress={progress}
                  memberCount={countByDeal[deal.id] ?? 0}
                  collected={collected}
                  joined
                  estimate={estimate}
                  contribution_pct={membership.contribution_pct}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Deal board */}
      <div className="mb-6">
        <SectionLabel>
          {products.length > 0 ? "⭐ AI-Matched Deals For Your Shop" : "Open Deals"}
        </SectionLabel>
        {rankedDeals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-reaper-border p-8 text-center">
            <div className="text-4xl mb-3">📦</div>
            <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim mb-2">NO OPEN DEALS YET</div>
            <p className="text-reaper-muted text-sm">Be the first — propose a deal below and other sellers can co-fund it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-2">
            {rankedDeals.map((deal, i) => {
              const collected = collectedByDeal[deal.id] ?? 0;
              const progress  = computePoolProgress(deal.target_amount, collected);
              return (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  progress={progress}
                  memberCount={countByDeal[deal.id] ?? 0}
                  collected={collected}
                  aiMatch={i < 3 && products.length > 0}
                  revenue30d={revenue30d}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Propose a deal */}
      <Card className="p-5">
        <SectionLabel>💡 Don&apos;t See What You Need?</SectionLabel>
        <p className="text-[11px] text-reaper-dim mb-4">
          Found a great AliExpress product that would sell on TikTok? Propose it to the community.
          Once approved, other sellers can co-fund it with you.
        </p>
        <ProposePoolForm />
      </Card>
    </div>
  );
}

// ── DEAL CARD ────────────────────────────────────
function DealCard({
  deal, progress, memberCount, collected, joined, estimate, contribution_pct, aiMatch, revenue30d,
}: {
  deal: PoolDeal;
  progress: { pct: number; remaining: number; funded: boolean };
  memberCount: number;
  collected: number;
  joined?: boolean;
  estimate?: number;
  contribution_pct?: number;
  aiMatch?: boolean;
  revenue30d?: number;
}) {
  const statusColors = {
    open:      { border: "border-reaper-border",  badge: "ghost"   as const },
    funded:    { border: "border-reaper-green",   badge: "safe"    as const },
    ordered:   { border: "border-sky-600",        badge: "info"    as const },
    delivered: { border: "border-reaper-green",   badge: "safe"    as const },
  }[deal.status] ?? { border: "border-reaper-border", badge: "ghost" as const };

  const barColor =
    progress.pct >= 100 ? "bg-reaper-green" :
    progress.pct >= 60  ? "bg-reaper-gold"  :
                          "bg-reaper-red";

  return (
    <Link href={`/dashboard/pool/${deal.id}`}>
      <div className={`rounded-lg border bg-reaper-bg2 p-4 hover:border-reaper-dim transition-all cursor-pointer h-full ${joined ? "border-reaper-green bg-[#001409]" : statusColors.border}`}>

        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {aiMatch && <Badge variant="warning" className="text-[7px]">⭐ AI MATCH</Badge>}
              {joined  && <Badge variant="safe"    className="text-[7px]">✓ JOINED</Badge>}
              {deal.proposed_by && <Badge variant="ghost" className="text-[7px]">PROPOSED</Badge>}
              {deal.category && (
                <span className="font-mono-dm text-[7px] text-reaper-dim">{deal.category}</span>
              )}
            </div>
            <div className="font-mono-dm text-[11px] text-reaper-text font-medium leading-snug">{deal.title}</div>
          </div>
          <div className="text-right shrink-0">
            <div className="font-display text-xl text-reaper-gold leading-none">${deal.unit_price}</div>
            <div className="font-mono-dm text-[7px] text-reaper-dim">/ unit</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <div className="flex justify-between items-baseline mb-1">
            <span className="font-mono-dm text-[8px] text-reaper-dim">
              ${collected.toLocaleString()} collected
            </span>
            <span className="font-mono-dm text-[8px] text-reaper-muted">
              target ${deal.target_amount.toLocaleString()}
            </span>
          </div>
          <div className="h-1.5 bg-reaper-bg3 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${barColor}`}
              style={{ width: `${progress.pct}%` }}
            />
          </div>
          <div className="flex justify-between items-baseline mt-1">
            <span className={`font-display text-lg leading-none ${progress.pct >= 100 ? "text-reaper-green" : "text-reaper-text"}`}>
              {progress.pct.toFixed(0)}%
            </span>
            <span className="font-mono-dm text-[8px] text-reaper-dim">
              {memberCount} member{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-reaper-border">
          <div className="font-mono-dm text-[8px] text-reaper-dim">
            {deal.min_units} units · MOQ
          </div>
          {joined && estimate !== undefined && contribution_pct !== undefined ? (
            <div className="font-mono-dm text-[8px] text-reaper-green">
              Your share: ≈${estimate}/mo · {contribution_pct}%
            </div>
          ) : revenue30d && revenue30d > 0 ? (
            <div className="font-mono-dm text-[8px] text-reaper-dim">
              ≈${Math.round(revenue30d * 0.02)}/mo at 2%
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
