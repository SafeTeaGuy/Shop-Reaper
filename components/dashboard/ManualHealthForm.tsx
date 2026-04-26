"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ManualShopHealth } from "@/types";

interface Props {
  shopId: string;
  existing?: ManualShopHealth | null;
}

export function ManualHealthForm({ shopId, existing }: Props) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved]     = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [sps,    setSps]    = useState(String(existing?.sps_computed          ?? ""));
  const [otd,    setOtd]    = useState(String(existing?.on_time_delivery_rate ?? ""));
  const [refund, setRefund] = useState(String(existing?.refund_rate           ?? ""));
  const [rev,    setRev]    = useState(String(existing?.revenue_30d           ?? ""));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setLoading(true);

    const res = await fetch("/api/reaper/manual-health", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id:               shopId,
        sps_computed:          sps,
        on_time_delivery_rate: otd,
        refund_rate:           refund,
        revenue_30d:           rev,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to save. Try again.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <p className="text-[11px] text-reaper-dim leading-relaxed">
        Enter your current shop metrics. These drive the readiness score and budget signal.
        Update any time your numbers change.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <HealthField
          label="SPS Score"
          hint="0.0 – 5.0 (find in TikTok Seller Center)"
          value={sps}
          onChange={setSps}
          type="number"
          min="0" max="5" step="0.1"
          placeholder="e.g. 3.8"
          threshold={{ pass: Number(sps) >= 3.5, target: "≥3.5" }}
        />
        <HealthField
          label="On-Time Delivery %"
          hint="Target ≥85%"
          value={otd}
          onChange={setOtd}
          type="number"
          min="0" max="100" step="0.1"
          placeholder="e.g. 88.4"
          threshold={{ pass: Number(otd) >= 85, target: "≥85%" }}
        />
        <HealthField
          label="Refund Rate %"
          hint="Target <5%"
          value={refund}
          onChange={setRefund}
          type="number"
          min="0" max="100" step="0.1"
          placeholder="e.g. 3.2"
          threshold={{ pass: Number(refund) < 5, target: "<5%", invertPass: true }}
        />
        <HealthField
          label="30-Day Revenue ($)"
          hint="Used to estimate wasted ad spend"
          value={rev}
          onChange={setRev}
          type="number"
          min="0" step="1"
          placeholder="e.g. 12400"
        />
      </div>

      {error && <p className="text-[10px] text-reaper-red font-mono-dm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-reaper-red text-white font-mono-dm text-[9px] tracking-[2px] py-3 rounded uppercase hover:shadow-[0_0_20px_rgba(217,26,15,0.4)] disabled:opacity-50 transition-all"
      >
        {loading ? "SAVING…" : saved ? "✓ SAVED — REFRESHING…" : "SAVE SHOP HEALTH"}
      </button>
    </form>
  );
}

function HealthField({
  label, hint, value, onChange, type = "text",
  min, max, step, placeholder,
  threshold,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void;
  type?: string; min?: string; max?: string; step?: string; placeholder?: string;
  threshold?: { pass: boolean; target: string; invertPass?: boolean };
}) {
  const showBadge = threshold && value !== "";
  const passing   = showBadge && threshold.pass;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase">{label}</label>
        {showBadge && (
          <span className={`font-mono-dm text-[7px] ${passing ? "text-reaper-green" : "text-reaper-red"}`}>
            {passing ? `✓ ${threshold.target}` : `✗ need ${threshold.target}`}
          </span>
        )}
      </div>
      <input
        type={type} min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-reaper-bg border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm"
      />
      {hint && <p className="font-mono-dm text-[8px] text-reaper-dim mt-0.5">{hint}</p>}
    </div>
  );
}
