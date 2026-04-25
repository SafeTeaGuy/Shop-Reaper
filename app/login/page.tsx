"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail]     = useState("");
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const params                = useSearchParams();
  const ref                   = params.get("ref") ?? "";

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: ref ? { referral_code: ref } : undefined,
      },
    });

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-reaper-bg flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="text-5xl mb-3 inline-block animate-float">💀</div>
          <h1 className="font-display text-4xl tracking-widest text-reaper-red">SHOP REAPER</h1>
          <p className="text-reaper-muted text-sm mt-1 font-mono-dm tracking-wider text-[10px]">
            TIKTOK WON&apos;T WARN YOU. WE WILL.
          </p>
          {ref === "CASHKING" && (
            <div className="mt-3 bg-[#0d0800] border border-reaper-orange rounded-lg px-4 py-2.5 text-sm text-reaper-orange">
              👑 Welcome, Cash King fam. Free 7-day trial, no credit card.
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-reaper-bg2 border border-reaper-border rounded-xl p-6">
          {!sent ? (
            <>
              <h2 className="font-display text-xl tracking-widest text-reaper-text mb-1">GET STARTED</h2>
              <p className="text-reaper-dim text-xs mb-5">Enter your email — we&apos;ll send a magic login link. No password needed.</p>

              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-reaper-bg3 border border-reaper-border rounded-lg px-4 py-3 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm"
                />
                {error && <p className="text-reaper-red text-xs font-mono-dm">{error}</p>}
                <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full">
                  SEND MAGIC LINK
                </Button>
              </form>

              <p className="text-[10px] text-reaper-dim text-center mt-4 font-mono-dm">
                Free 7-day trial · No credit card · Cancel anytime
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-3">📬</div>
              <h3 className="font-display text-2xl tracking-wider text-reaper-green mb-2">CHECK YOUR EMAIL</h3>
              <p className="text-reaper-muted text-sm">
                Magic link sent to <span className="text-reaper-text font-semibold">{email}</span>.
                Click it to sign in instantly.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
