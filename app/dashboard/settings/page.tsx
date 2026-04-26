"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, SectionLabel, Badge } from "@/components/ui";
import type { User, Shop } from "@/types";

export default function SettingsPage() {
  const [user, setUser]       = useState<User | null>(null);
  const [shops, setShops]     = useState<Shop[]>([]);
  const [phone, setPhone]     = useState("");
  const [smsOn, setSmsOn]     = useState(false);
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const [{ data: u }, { data: s }] = await Promise.all([
        supabase.from("users").select("*").eq("id", authUser.id).single(),
        supabase.from("shops").select("*").eq("user_id", authUser.id),
      ]);
      if (u) { setUser(u as User); setPhone(u.sms_phone ?? ""); setSmsOn(u.sms_enabled); }
      if (s) setShops(s as Shop[]);
    })();
  }, []);

  async function saveSettings() {
    if (!user) return;
    setSaving(true);
    const supabase = createClient();
    await supabase.from("users").update({ sms_phone: phone, sms_enabled: smsOn }).eq("id", user.id);
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  async function openPortal() {
    setPortalLoading(true);
    const res = await fetch("/api/stripe/portal", { method: "POST" });
    const { url } = await res.json();
    if (url) window.location.href = url;
    setPortalLoading(false);
  }

  async function disconnectShop(shopId: string) {
    if (!confirm("Disconnect this shop? You can reconnect anytime.")) return;
    const supabase = createClient();
    await supabase.from("shops").update({ is_active: false }).eq("id", shopId);
    setShops((prev) => prev.filter((s) => s.id !== shopId));
  }

  const tierColors: Record<string, string> = {
    basic:  "text-reaper-muted",
    reaper: "text-reaper-red",
    agency: "text-reaper-gold",
  };

  return (
    <div className="p-6 max-w-2xl">
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">Account</div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">SETTINGS</h1>
      </div>

      {/* Plan */}
      <Card className="p-5 mb-4">
        <SectionLabel>Plan & Billing</SectionLabel>
        <div className="flex items-center justify-between mt-2">
          <div>
            <div className={`font-display text-2xl tracking-widest ${tierColors[user?.plan_tier ?? "basic"]}`}>
              {(user?.plan_tier ?? "basic").toUpperCase()} PLAN
            </div>
            <div className="text-xs text-reaper-dim mt-0.5">
              {{basic: "$19/mo", reaper: "$49/mo", agency: "$99/mo"}[user?.plan_tier ?? "basic"]}
            </div>
          </div>
          <div className="flex gap-2">
            {user?.plan_tier === "basic" && (
              <Button variant="primary" size="sm" onClick={() =>
                fetch("/api/stripe/checkout", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ tier: "reaper" }),
                }).then((r) => r.json()).then((d) => window.location.href = d.url)
              }>
                Upgrade to Reaper
              </Button>
            )}
            {user?.stripe_customer_id && (
              <Button variant="ghost" size="sm" loading={portalLoading} onClick={openPortal}>
                Manage Billing
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* SMS Alerts */}
      <Card className="p-5 mb-4">
        <SectionLabel>SMS Alerts</SectionLabel>
        {user?.plan_tier === "basic" ? (
          <div className="mt-2 bg-[#1C0000] border border-reaper-red rounded-lg p-3 text-xs text-reaper-red">
            SMS alerts require Reaper or Agency plan. Upgrade to get critical alerts via text.
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSmsOn(!smsOn)}
                className={`w-10 h-5 rounded-full transition-colors relative ${smsOn ? "bg-reaper-red" : "bg-reaper-bg3 border border-reaper-border"}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${smsOn ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
              <span className="text-sm text-reaper-muted">
                {smsOn ? "SMS enabled — critical alerts will fire to your phone" : "SMS disabled"}
              </span>
            </div>
            {smsOn && (
              <div className="flex gap-2">
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 555 000 0000"
                  className="flex-1 bg-reaper-bg3 border border-reaper-border rounded-lg px-4 py-2.5 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm"
                />
                <Button variant="primary" size="md" loading={saving} onClick={saveSettings}>
                  {saved ? "Saved ✓" : "Save"}
                </Button>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Connected Shops */}
      <Card className="p-5 mb-4">
        <SectionLabel>Connected Shops</SectionLabel>
        <div className="flex flex-col gap-2 mt-2">
          {shops.length === 0 && (
            <div className="text-sm text-reaper-dim py-2">No shops connected.</div>
          )}
          {shops.map((s) => (
            <div key={s.id} className="flex items-center justify-between py-2.5 border-b border-reaper-border last:border-b-0">
              <div>
                <div className="text-sm font-semibold text-reaper-text">{s.shop_name}</div>
                <div className="font-mono-dm text-[9px] text-reaper-dim mt-0.5">
                  {s.tiktok_handle} · {s.region} ·{" "}
                  {s.last_synced_at
                    ? `Last sync ${new Date(s.last_synced_at).toLocaleTimeString()}`
                    : "Pending first sync"}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Badge variant="safe">ACTIVE</Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => disconnectShop(s.id)}
                  className="text-[8px]"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          ))}
        </div>
        {(user?.plan_tier === "reaper" ? shops.length < 3 : user?.plan_tier === "agency" ? true : shops.length < 1) && (
          <a
            href="/api/tiktok/connect"
            className="mt-3 flex items-center justify-center gap-2 border border-dashed border-reaper-border2 rounded-lg py-3 text-xs text-reaper-dim hover:text-reaper-muted hover:border-reaper-dim transition-colors font-mono-dm tracking-wider"
          >
            + Connect Another Shop
          </a>
        )}
      </Card>

      {/* Account */}
      <Card className="p-5">
        <SectionLabel>Account</SectionLabel>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <div className="text-sm text-reaper-text">{user?.email}</div>
            <div className="font-mono-dm text-[9px] text-reaper-dim mt-0.5">
              Member since {user ? new Date(user.created_at).toLocaleDateString() : "—"}
              {user?.referred_by && ` · Referred by ${user.referred_by}`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              window.location.href = "/login";
            }}
          >
            Sign Out
          </Button>
        </div>
      </Card>
    </div>
  );
}
