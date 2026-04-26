import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { computePoolProgress } from "@/lib/reaper/pool";
import { Card, Badge, SectionLabel } from "@/components/ui";
import { JoinPoolForm } from "@/components/dashboard/JoinPoolForm";
import type { PoolDeal, PoolMembership, PoolContribution } from "@/types";

export default async function PoolDealPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: shop } = await supabase
    .from("shops").select("id, shop_name, tiktok_handle").eq("user_id", authUser.id)
    .eq("is_active", true).order("connected_at", { ascending: false }).limit(1).single();
  if (!shop) redirect("/dashboard");

  const [dealRes, membershipRes, metricsRes, contributionsRes, memberCountRes] = await Promise.all([
    supabase.from("pool_deals").select("*").eq("id", id).single(),
    supabase.from("pool_memberships").select("*").eq("pool_deal_id", id).eq("user_id", authUser.id).maybeSingle(),
    supabase.from("metrics").select("revenue_30d").eq("shop_id", shop.id).order("date", { ascending: false }).limit(1).single(),
    supabase.from("pool_contributions").select("amount, period, status, created_at").eq("pool_deal_id", id).eq("status", "collected").order("created_at", { ascending: false }).limit(50),
    supabase.from("pool_memberships").select("pool_deal_id").eq("pool_deal_id", id).eq("is_active", true),
  ]);

  if (dealRes.error || !dealRes.data) notFound();

  const deal        = dealRes.data as PoolDeal;
  const membership  = membershipRes.data as PoolMembership | null;
  const revenue30d  = (metricsRes.data?.revenue_30d ?? 0) as number;
  const contributions = (contributionsRes.data ?? []) as Pick<PoolContribution, "amount" | "period" | "status" | "created_at">[];
  const memberCount = memberCountRes.data?.length ?? 0;

  // Collected = sum of all collected contributions for this deal
  const { data: collectedData } = await supabase
    .from("pool_contributions")
    .select("amount")
    .eq("pool_deal_id", id)
    .eq("status", "collected");

  const totalCollected = (collectedData ?? []).reduce((s, r) => s + Number(r.amount), 0);
  const progress = computePoolProgress(deal.target_amount, totalCollected);

  const barColor =
    progress.pct >= 100 ? "bg-reaper-green" :
    progress.pct >= 60  ? "bg-reaper-gold"  :
                          "bg-reaper-red";

  const statusLabel: Record<string, string> = {
    open:      "OPEN",
    funded:    "FUNDED",
    ordered:   "ORDERED",
    delivered: "DELIVERED",
    draft:     "PENDING REVIEW",
    cancelled: "CANCELLED",
  };

  return (
    <div className="p-6 max-w-4xl">
      {/* Breadcrumb */}
      <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim mb-4">
        <Link href="/dashboard/pool" className="hover:text-reaper-muted transition-colors">CO-OP POOL</Link>
        <span className="mx-2">›</span>
        <span className="text-reaper-muted">{deal.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: deal info + progress */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant={deal.status === "funded" || deal.status === "delivered" ? "safe" : deal.status === "ordered" ? "info" : "ghost"}>
                {statusLabel[deal.status] ?? deal.status.toUpperCase()}
              </Badge>
              {deal.category && (
                <span className="font-mono-dm text-[7px] text-reaper-dim">{deal.category}</span>
              )}
              {deal.proposed_by && (
                <Badge variant="warning" className="text-[7px]">SELLER PROPOSED</Badge>
              )}
            </div>
            <h1 className="font-display text-3xl tracking-wider text-reaper-text mb-1">{deal.title}</h1>
            {deal.description && (
              <p className="text-sm text-reaper-muted leading-relaxed">{deal.description}</p>
            )}
          </div>

          {/* Price + units stats */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="p-3 text-center">
              <div className="font-display text-2xl text-reaper-gold leading-none">${deal.unit_price}</div>
              <div className="font-mono-dm text-[7px] text-reaper-dim mt-1">per unit</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="font-display text-2xl text-reaper-text leading-none">{deal.min_units.toLocaleString()}</div>
              <div className="font-mono-dm text-[7px] text-reaper-dim mt-1">min units (MOQ)</div>
            </Card>
            <Card className="p-3 text-center">
              <div className="font-display text-2xl text-reaper-text leading-none">{memberCount}</div>
              <div className="font-mono-dm text-[7px] text-reaper-dim mt-1">contributor{memberCount !== 1 ? "s" : ""}</div>
            </Card>
          </div>

          {/* Progress */}
          <Card className="p-5">
            <SectionLabel>Pool Progress</SectionLabel>
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-2">
                <span className={`font-display text-4xl leading-none ${progress.pct >= 100 ? "text-reaper-green" : "text-reaper-text"}`}>
                  {progress.pct.toFixed(1)}%
                </span>
                <div className="text-right">
                  <div className="font-mono-dm text-[9px] text-reaper-muted">
                    ${totalCollected.toLocaleString()} collected
                  </div>
                  <div className="font-mono-dm text-[8px] text-reaper-dim">
                    target ${deal.target_amount.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="h-3 bg-reaper-bg3 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full transition-all ${barColor}`}
                  style={{ width: `${progress.pct}%` }}
                />
              </div>

              {progress.funded ? (
                <div className="font-mono-dm text-[8px] text-reaper-green">
                  ✓ TARGET REACHED — REAPER IS PLACING THE ORDER
                </div>
              ) : (
                <div className="font-mono-dm text-[8px] text-reaper-dim">
                  ${progress.remaining.toLocaleString()} remaining to unlock bulk order
                </div>
              )}
            </div>
          </Card>

          {/* AliExpress link */}
          <div className="rounded-lg border border-reaper-border bg-reaper-bg2 px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-mono-dm text-[7px] tracking-[2px] text-reaper-dim mb-0.5">SOURCE PRODUCT</div>
              <div className="font-mono-dm text-[9px] text-reaper-muted truncate max-w-xs">{deal.aliexpress_url}</div>
            </div>
            <a
              href={deal.aliexpress_url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 ml-4 font-mono-dm text-[8px] tracking-[1.5px] text-reaper-orange hover:text-reaper-gold transition-colors"
            >
              VIEW ON ALIEXPRESS ↗
            </a>
          </div>

          {/* Contribution history */}
          {contributions.length > 0 && (
            <Card className="p-5">
              <SectionLabel>Recent Contributions</SectionLabel>
              <div className="mt-3 flex flex-col gap-1.5">
                {contributions.slice(0, 20).map((c, i) => {
                  const label = i === 0 && membership ? "You" : `Seller ${String.fromCharCode(65 + (i % 26))}`;
                  const date = new Date(c.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" });
                  return (
                    <div key={i} className="flex items-center justify-between py-1.5 border-b border-reaper-border last:border-0">
                      <span className="font-mono-dm text-[9px] text-reaper-muted">{label}</span>
                      <div className="text-right">
                        <span className="font-mono-dm text-[9px] text-reaper-green">${Number(c.amount).toLocaleString()}</span>
                        <span className="font-mono-dm text-[8px] text-reaper-dim ml-2">{date}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>

        {/* Right: join form */}
        <div className="flex flex-col gap-4">
          {deal.status === "open" ? (
            <JoinPoolForm
              dealId={deal.id}
              shopId={shop.id}
              revenue30d={revenue30d}
              existingPct={membership?.contribution_pct ?? null}
              isActive={membership?.is_active ?? false}
            />
          ) : (
            <div className="rounded-lg border border-reaper-border bg-reaper-bg2 p-4">
              <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim mb-2">DEAL STATUS</div>
              <div className={`font-display text-xl ${deal.status === "funded" || deal.status === "delivered" ? "text-reaper-green" : "text-reaper-muted"}`}>
                {statusLabel[deal.status] ?? deal.status.toUpperCase()}
              </div>
              {deal.status === "funded" && (
                <p className="font-mono-dm text-[8px] text-reaper-dim mt-2 leading-relaxed">
                  This pool hit its target. Reaper is coordinating the bulk purchase from AliExpress.
                </p>
              )}
              {deal.status === "ordered" && (
                <p className="font-mono-dm text-[8px] text-reaper-dim mt-2 leading-relaxed">
                  Order placed with AliExpress. Tracking updates will appear here once shipped.
                </p>
              )}
            </div>
          )}

          {/* Legal notice */}
          <div className="rounded-lg border border-reaper-orange bg-[#0d0800] px-4 py-3">
            <div className="font-mono-dm text-[7px] text-reaper-orange leading-relaxed">
              ⚠️ CO-OP BETA — contributions are charged monthly via your saved payment method and are non-refundable once collected. Contact support before joining if you have questions.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
