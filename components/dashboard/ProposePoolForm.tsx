"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Beauty & Skincare", "Health & Wellness", "Fashion & Accessories",
  "Home & Kitchen", "Electronics", "Sports & Outdoors", "Toys & Games", "Other",
];

export function ProposePoolForm() {
  const router = useRouter();
  const [open, setOpen]     = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone]     = useState(false);
  const [error, setError]   = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "", aliexpress_url: "", unit_price: "", min_units: "", description: "", category: "",
  });

  function set(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const target =
    form.unit_price && form.min_units
      ? (Number(form.unit_price) * Number(form.min_units)).toFixed(2)
      : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/reaper/pool/propose", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Submission failed. Try again.");
      return;
    }
    setDone(true);
    setTimeout(() => { setOpen(false); setDone(false); router.refresh(); }, 2000);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-dashed border-reaper-border2 rounded-md py-3 font-mono-dm text-[9px] tracking-[2px] text-reaper-dim hover:text-reaper-muted hover:border-reaper-dim transition-colors"
      >
        💡 PROPOSE A DEAL
      </button>
    );
  }

  if (done) {
    return (
      <div className="rounded-lg border border-reaper-green bg-[#001409] p-5 text-center">
        <div className="font-display text-2xl text-reaper-green mb-1">SUBMITTED</div>
        <p className="font-mono-dm text-[9px] text-reaper-dim">
          Your deal is under review. We&apos;ll publish it to the board once approved.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-reaper-border bg-reaper-bg3 p-5 flex flex-col gap-3">
      <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-1">PROPOSE A POOL DEAL</div>
      <p className="font-mono-dm text-[9px] text-reaper-dim leading-relaxed">
        Found a great AliExpress product? Propose it. If approved, other sellers can co-fund it with you.
      </p>

      {error && <p className="text-[10px] text-reaper-red font-mono-dm">{error}</p>}

      {/* Title */}
      <Field label="Product Name *" value={form.title} onChange={(v) => set("title", v)} placeholder="e.g. Vitamin C Serum 30ml Dropper" />

      {/* AliExpress URL */}
      <Field label="AliExpress URL *" type="url" value={form.aliexpress_url} onChange={(v) => set("aliexpress_url", v)} placeholder="https://aliexpress.com/item/..." />

      {/* Category */}
      <div>
        <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase block mb-1">Category</label>
        <select
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          className="w-full bg-reaper-bg2 border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text focus:outline-none focus:border-reaper-dim font-mono-dm"
        >
          <option value="">Select category…</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Price + Units */}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Unit Price ($) *" type="number" min="0.01" step="0.01" value={form.unit_price} onChange={(v) => set("unit_price", v)} placeholder="e.g. 4.80" />
        <Field label="Min Units (MOQ) *" type="number" min="1" step="1" value={form.min_units} onChange={(v) => set("min_units", v)} placeholder="e.g. 500" />
      </div>

      {/* Target preview */}
      {target && (
        <div className="rounded border border-reaper-border2 bg-reaper-bg2 p-2.5 text-center">
          <div className="font-mono-dm text-[8px] text-reaper-dim mb-0.5">POOL TARGET</div>
          <div className="font-display text-2xl text-reaper-gold">${Number(target).toLocaleString()}</div>
          <div className="font-mono-dm text-[8px] text-reaper-dim">{form.min_units} units × ${form.unit_price}</div>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase block mb-1">Why this product? (optional)</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="e.g. Top seller in beauty niche, 4.8★ on AliExpress, already proven on TikTok…"
          className="w-full bg-reaper-bg2 border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm resize-none"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-reaper-red text-white font-mono-dm text-[9px] tracking-[2px] py-2.5 rounded uppercase hover:shadow-[0_0_20px_rgba(217,26,15,0.4)] disabled:opacity-50 transition-all"
        >
          {loading ? "SUBMITTING…" : "SUBMIT FOR REVIEW"}
        </button>
        <button
          type="button"
          onClick={() => { setOpen(false); setError(null); }}
          className="px-4 border border-reaper-border text-reaper-dim font-mono-dm text-[9px] tracking-wider rounded hover:text-reaper-muted transition-colors"
        >
          CANCEL
        </button>
      </div>
    </form>
  );
}

function Field({ label, type = "text", value, onChange, placeholder, min, step }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; min?: string; step?: string;
}) {
  return (
    <div>
      <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase block mb-1">{label}</label>
      <input
        type={type} min={min} step={step}
        value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-reaper-bg2 border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm"
      />
    </div>
  );
}
