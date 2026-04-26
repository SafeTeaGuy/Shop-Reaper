"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/components/ui";
import type { Product } from "@/types";

const SOURCE_LABELS: Record<string, string> = {
  tiktok:    "TikTok",
  manual:    "Manual",
  aliexpress:"AliExpress",
};

const SOURCE_COLORS: Record<string, string> = {
  tiktok:    "border-reaper-dim text-reaper-dim",
  manual:    "border-sky-600 text-sky-400",
  aliexpress:"border-reaper-orange text-reaper-orange",
};

interface Props {
  shopId: string;
  products: Product[];
}

type FormSource = "manual" | "aliexpress";

interface FormState {
  name: string;
  price: string;
  cvr_30d: string;
  source: FormSource;
  source_url: string;
}

const EMPTY: FormState = { name: "", price: "", cvr_30d: "", source: "manual", source_url: "" };

export function ProductCatalog({ shopId, products }: Props) {
  const router = useRouter();
  const [open, setOpen]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError]     = useState<string | null>(null);
  const [form, setForm]       = useState<FormState>(EMPTY);

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function addProduct(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name.trim() || !form.cvr_30d) { setError("Name and CVR are required."); return; }
    setLoading(true);

    const res = await fetch("/api/reaper/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shop_id:    shopId,
        name:       form.name,
        price:      form.price,
        cvr_30d:    form.cvr_30d,
        source:     form.source,
        source_url: form.source_url || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(j.error ?? "Failed to add product.");
      return;
    }
    setOpen(false);
    setForm(EMPTY);
    router.refresh();
  }

  async function deleteProduct(id: string) {
    setDeleting(id);
    await fetch("/api/reaper/products", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setDeleting(null);
    router.refresh();
  }

  const manualProducts = products.filter((p) => p.source !== "tiktok");
  const tiktokProducts = products.filter((p) => p.source === "tiktok");

  return (
    <div>
      {/* Existing TikTok products */}
      {tiktokProducts.length > 0 && (
        <div className="mb-4">
          <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-2">
            TIKTOK SYNCED · {tiktokProducts.length} PRODUCTS
          </div>
          <div className="flex flex-col gap-1.5">
            {tiktokProducts.map((p) => (
              <ProductRow key={p.id} product={p} />
            ))}
          </div>
        </div>
      )}

      {/* Manual / AliExpress products */}
      <div className="mb-4">
        <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase mb-2">
          MANUAL / ALIEXPRESS · {manualProducts.length} PRODUCT{manualProducts.length !== 1 ? "S" : ""}
        </div>
        {manualProducts.length > 0 ? (
          <div className="flex flex-col gap-1.5 mb-3">
            {manualProducts.map((p) => (
              <ProductRow
                key={p.id}
                product={p}
                onDelete={() => deleteProduct(p.id)}
                deleting={deleting === p.id}
              />
            ))}
          </div>
        ) : (
          <div className="rounded border border-dashed border-reaper-border p-3 text-center mb-3">
            <p className="font-mono-dm text-[9px] text-reaper-dim tracking-wider">
              NO MANUAL PRODUCTS YET — add AliExpress or dropshipping products below
            </p>
          </div>
        )}
      </div>

      {/* Add form toggle */}
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full border border-dashed border-reaper-border2 rounded-md py-2.5 font-mono-dm text-[9px] tracking-[2px] text-reaper-dim hover:text-reaper-muted hover:border-reaper-dim transition-colors"
        >
          + ADD PRODUCT
        </button>
      ) : (
        <form onSubmit={addProduct} className="rounded-lg border border-reaper-border bg-reaper-bg3 p-4 flex flex-col gap-3">
          <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-1">ADD PRODUCT</div>

          {error && (
            <div className="text-[10px] text-reaper-red font-mono-dm">{error}</div>
          )}

          {/* Source type */}
          <div className="flex gap-2">
            {(["manual", "aliexpress"] as FormSource[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set("source", s)}
                className={cn(
                  "flex-1 py-2 rounded border font-mono-dm text-[9px] tracking-wider uppercase transition-all",
                  form.source === s
                    ? s === "aliexpress"
                      ? "bg-[#1C0E00] border-reaper-orange text-reaper-orange"
                      : "bg-[#001422] border-sky-600 text-sky-400"
                    : "border-reaper-border text-reaper-dim hover:border-reaper-dim"
                )}
              >
                {s === "aliexpress" ? "🛒 AliExpress" : "✏️ Manual"}
              </button>
            ))}
          </div>

          {/* Product name */}
          <div>
            <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase block mb-1">Product Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Glow Serum 30ml"
              required
              className="w-full bg-reaper-bg2 border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm"
            />
          </div>

          {/* Source URL (AliExpress) */}
          {form.source === "aliexpress" && (
            <div>
              <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase block mb-1">AliExpress URL</label>
              <input
                type="url"
                value={form.source_url}
                onChange={(e) => set("source_url", e.target.value)}
                placeholder="https://aliexpress.com/item/..."
                className="w-full bg-reaper-bg2 border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-orange font-mono-dm"
              />
            </div>
          )}

          {/* Price + CVR row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase block mb-1">Price ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
                placeholder="29.99"
                className="w-full bg-reaper-bg2 border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm"
              />
            </div>
            <div>
              <label className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim uppercase block mb-1">CVR % *</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={form.cvr_30d}
                onChange={(e) => set("cvr_30d", e.target.value)}
                placeholder="e.g. 3.5"
                required
                className="w-full bg-reaper-bg2 border border-reaper-border rounded px-3 py-2 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm"
              />
              {form.cvr_30d && (
                <div className={cn(
                  "font-mono-dm text-[8px] mt-1",
                  Number(form.cvr_30d) >= 3 ? "text-reaper-green" :
                  Number(form.cvr_30d) >= 2 ? "text-reaper-orange" : "text-reaper-red"
                )}>
                  {Number(form.cvr_30d) >= 3 ? "▶ HERO — run GMV Max" :
                   Number(form.cvr_30d) >= 2 ? "▶ TEST — watch carefully" :
                   Number(form.cvr_30d) >= 1 ? "▶ WARNING — optimise first" :
                                               "▶ SKIP — don't run GMV Max"}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-reaper-red text-white font-mono-dm text-[9px] tracking-[2px] py-2.5 rounded uppercase hover:shadow-[0_0_20px_rgba(217,26,15,0.4)] disabled:opacity-50 transition-all"
            >
              {loading ? "ADDING…" : "ADD PRODUCT"}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError(null); setForm(EMPTY); }}
              className="px-4 border border-reaper-border text-reaper-dim font-mono-dm text-[9px] tracking-wider rounded hover:text-reaper-muted transition-colors"
            >
              CANCEL
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function ProductRow({ product, onDelete, deleting }: {
  product: Product;
  onDelete?: () => void;
  deleting?: boolean;
}) {
  const isManual = product.source !== "tiktok";
  const cvrColor =
    product.cvr_30d >= 3 ? "text-reaper-green" :
    product.cvr_30d >= 2 ? "text-reaper-orange" :
                           "text-reaper-red";

  return (
    <div className="flex items-center gap-3 rounded border border-reaper-border bg-reaper-bg2 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[11px] text-reaper-text truncate">{product.name}</span>
          <span className={cn(
            "font-mono-dm text-[7px] tracking-wider border rounded px-1.5 py-0.5 shrink-0",
            SOURCE_COLORS[product.source] ?? SOURCE_COLORS.manual
          )}>
            {SOURCE_LABELS[product.source] ?? product.source}
          </span>
        </div>
        {product.source_url && (
          <div className="font-mono-dm text-[8px] text-reaper-orange truncate">
            {product.source_url.replace(/^https?:\/\//, "").slice(0, 48)}…
          </div>
        )}
        {product.price > 0 && (
          <div className="font-mono-dm text-[8px] text-reaper-dim">${product.price.toFixed(2)}</div>
        )}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div>
          <div className={`font-display text-xl leading-none ${cvrColor}`}>{product.cvr_30d.toFixed(1)}%</div>
          <div className="font-mono-dm text-[7px] text-reaper-dim text-right">CVR</div>
        </div>
        {isManual && onDelete && (
          <button
            onClick={onDelete}
            disabled={deleting}
            className="font-mono-dm text-[8px] text-reaper-dim hover:text-reaper-red transition-colors disabled:opacity-40 px-1"
            title="Remove product"
          >
            {deleting ? "…" : "✕"}
          </button>
        )}
      </div>
    </div>
  );
}
