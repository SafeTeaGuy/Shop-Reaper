"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui";

interface Props {
  dealId: string;
  shopId: string;
  revenue30d: number;
  existingPct?: number | null;
  isActive?: boolean;
}

export function JoinPoolForm({ dealId, shopId, revenue30d, existingPct, isActive }: Props) {
  const router  = useRouter();
  const [pct, setPct]       = useState(existingPct ?? 2);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const monthlyEstimate = Math.round(revenue30d * (pct / 100));

  async function join() {
    setError(null);
    setLoading(true);
    const res = await fetch("/api/reaper/pool/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pool_deal_id:    dealId,
        shop_id:         shopId,
        contribution_pct: pct,
      }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to join. Try again.");
      return;
    }
    router.refresh();
  }

  async function leave() {
    setError(null);
    setLoading(true);
    await fetch("/api/reaper/pool/leave", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pool_deal_id: dealId }),
    });
    setLoading(false);
    router.refresh();
  }

  if (isActive) {
    return (
      <div className="rounded-lg border border-reaper-green bg-[#001409] p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-green mb-0.5">YOU&apos;RE IN THIS POOL</div>
            <div className="font-mono-dm text-[9px] text-reaper-muted">
              Contributing <span className="text-reaper-green font-bold">{existingPct}%</span> of monthly revenue
              {revenue30d > 0 && (
                <span className="text-reaper-dim"> · ≈${Math.round(revenue30d * ((existingPct ?? 2) / 100))}/mo</span>
              )}
            </div>
          </div>
          <button
            onClick={leave}
            disabled={loading}
            className="font-mono-dm text-[8px] tracking-wider text-reaper-dim hover:text-reaper-red transition-colors disabled:opacity-40"
          >
            {loading ? "…" : "LEAVE POOL"}
          </button>
        </div>
        {error && <p className="text-[10px] text-reaper-red font-mono-dm">{error}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-reaper-border bg-reaper-bg3 p-4">
      <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-3">JOIN THIS POOL</div>

      {/* % slider */}
      <div className="mb-4">
        <div className="flex items-baseline justify-between mb-2">
          <label className="font-mono-dm text-[8px] tracking-wider text-reaper-dim uppercase">
            Monthly contribution
          </label>
          <div className="text-right">
            <span className="font-display text-2xl text-reaper-text">{pct}%</span>
            <span className="font-mono-dm text-[8px] text-reaper-dim ml-1">of revenue</span>
          </div>
        </div>

        <input
          type="range" min="1" max="20" step="0.5"
          value={pct}
          onChange={(e) => setPct(Number(e.target.value))}
          className="w-full accent-reaper-red"
        />

        <div className="flex justify-between font-mono-dm text-[8px] text-reaper-dim mt-1">
          <span>1%</span>
          <span>20%</span>
        </div>
      </div>

      {/* Estimate */}
      <div className={cn(
        "rounded border p-3 mb-4 text-center",
        monthlyEstimate > 0 ? "border-reaper-border2 bg-reaper-bg2" : "border-reaper-border bg-reaper-bg"
      )}>
        {revenue30d > 0 ? (
          <>
            <div className="font-display text-3xl text-reaper-text leading-none">
              ≈${monthlyEstimate.toLocaleString()}
            </div>
            <div className="font-mono-dm text-[8px] text-reaper-dim mt-1">
              per month · based on your ${revenue30d.toLocaleString()} 30-day revenue
            </div>
          </>
        ) : (
          <div className="font-mono-dm text-[9px] text-reaper-dim">
            Add your revenue data to see your monthly estimate
          </div>
        )}
      </div>

      <p className="font-mono-dm text-[9px] text-reaper-dim leading-relaxed mb-4">
        Your contribution is charged monthly from your saved payment method.
        You can leave at any time — already-collected contributions are non-refundable.
      </p>

      {error && <p className="text-[10px] text-reaper-red font-mono-dm mb-3">{error}</p>}

      <button
        onClick={join}
        disabled={loading}
        className="w-full bg-reaper-red text-white font-mono-dm text-[9px] tracking-[2px] py-3 rounded uppercase hover:shadow-[0_0_20px_rgba(217,26,15,0.4)] disabled:opacity-50 transition-all"
      >
        {loading ? "JOINING…" : `JOIN — CONTRIBUTE ${pct}% MONTHLY`}
      </button>
    </div>
  );
}
