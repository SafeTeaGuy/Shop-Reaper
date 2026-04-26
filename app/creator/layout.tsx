import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import type { User } from "@/types";

const CREATOR_NAV = [
  { href: "/creator/trends",      icon: "🔥", label: "TREND SCANNER",  color: "teal"   },
  { href: "/creator/commissions", icon: "💰", label: "COMMISSIONS",    color: "gold"   },
  { href: "/creator/hooks",       icon: "🎣", label: "HOOK OPTIMIZER", color: "purple" },
  { href: "/creator/scripts",     icon: "🎬", label: "AI SCRIPTS",     color: "pink"   },
];

const SELLER_NAV = [
  { href: "/dashboard",          icon: "📡", label: "SHOP HEALTH" },
  { href: "/dashboard/alerts",   icon: "⚡", label: "ALERTS"      },
  { href: "/dashboard/products", icon: "🔪", label: "SKU AUTOPSY" },
];

export default async function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const { data: userData } = await supabase
    .from("users")
    .select("plan_tier, email")
    .eq("id", authUser.id)
    .single();

  const user = userData as Pick<User, "plan_tier" | "email"> | null;

  return (
    <div className="flex min-h-screen bg-reaper-bg">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 h-screen bg-reaper-bg2 border-r border-reaper-border flex flex-col">
        {/* Brand */}
        <div className="px-4 py-4 border-b border-reaper-border flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1C0000] border border-reaper-red rounded-md flex items-center justify-center text-base">
            💀
          </div>
          <div>
            <div className="font-display text-lg tracking-widest text-reaper-red leading-none">REAPER</div>
            <div className="font-mono-dm text-[7.5px] tracking-[2px] text-reaper-dim mt-0.5">CREATOR SUITE</div>
          </div>
        </div>

        {/* Mode toggle */}
        <div className="m-2.5 grid grid-cols-2 bg-reaper-bg3 border border-reaper-border rounded-md overflow-hidden">
          <Link
            href="/dashboard"
            className="py-2 font-mono-dm text-[8px] tracking-[1.5px] text-center text-reaper-dim hover:text-reaper-muted transition-colors"
          >
            SELLER
          </Link>
          <div className="py-2 font-mono-dm text-[8px] tracking-[1.5px] text-center bg-reaper-red text-white">
            CREATOR
          </div>
        </div>

        {/* Creator nav */}
        <nav className="px-2.5 pt-1">
          <div className="font-mono-dm text-[7.5px] tracking-[2px] text-reaper-dim px-2 py-2">
            CREATOR TOOLS
          </div>
          {CREATOR_NAV.map(({ href, icon, label, color }) => {
            const colorMap: Record<string, string> = {
              teal:   "text-[#00C8B8] bg-[rgba(0,200,184,0.08)] border-[rgba(0,200,184,0.2)]",
              gold:   "text-reaper-gold bg-[rgba(201,150,10,0.08)] border-[rgba(201,150,10,0.2)]",
              purple: "text-[#9B59FF] bg-[rgba(155,89,255,0.08)] border-[rgba(155,89,255,0.2)]",
              pink:   "text-[#FF2D78] bg-[rgba(255,45,120,0.07)] border-[rgba(255,45,120,0.2)]",
            };
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 font-mono-dm text-[9.5px] tracking-[1.5px] border transition-all duration-150 ${colorMap[color]}`}
              >
                <span className="text-base leading-none">{icon}</span>
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Seller nav */}
        <nav className="px-2.5 pt-2">
          <div className="font-mono-dm text-[7.5px] tracking-[2px] text-reaper-dim px-2 py-2">
            SELLER TOOLS
          </div>
          {SELLER_NAV.map(({ href, icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-md mb-0.5 font-mono-dm text-[9.5px] tracking-[1.5px] text-reaper-dim border border-transparent hover:text-reaper-muted hover:bg-reaper-bg3 transition-all duration-150"
            >
              <span className="text-base leading-none">{icon}</span>
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom */}
        <div className="mt-auto px-4 py-4 border-t border-reaper-border">
          {user?.plan_tier === "basic" && (
            <Link
              href="/pricing"
              className="block w-full bg-reaper-red text-white text-center font-mono-dm text-[9px] tracking-[2px] py-2.5 rounded mb-3 hover:shadow-[0_0_20px_rgba(217,26,15,0.4)] transition-all"
            >
              UPGRADE ↑
            </Link>
          )}
          <div className="font-mono-dm text-[9px] text-reaper-dim truncate">{user?.email}</div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}
