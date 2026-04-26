"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui";
import type { Shop, User } from "@/types";

interface SidebarProps {
  user: User;
  shops: Shop[];
  activeShopId?: string;
}

const NAV = [
  { href: "/dashboard",           icon: "📡", label: "Overview"      },
  { href: "/dashboard/alerts",    icon: "⚡", label: "Alerts"       },
  { href: "/dashboard/products",  icon: "🔪", label: "SKU Autopsy"  },
  { href: "/dashboard/gmv",       icon: "💀", label: "GMV Max"      },
  { href: "/dashboard/coach",     icon: "💬", label: "Reaper Coach" },
  { href: "/dashboard/settings",  icon: "⚙️", label: "Settings"    },
];

export function Sidebar({ user, shops, activeShopId }: SidebarProps) {
  const path = usePathname();

  return (
    <aside className="w-56 min-h-screen bg-reaper-bg2 border-r border-reaper-border flex flex-col">
      {/* Brand */}
      <div className="px-5 py-4 border-b border-reaper-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#1C0000] border border-reaper-red rounded-md flex items-center justify-center text-base">
            💀
          </div>
          <div>
            <div className="font-display text-lg tracking-widest text-reaper-red leading-none">SHOP REAPER</div>
            <div className="font-mono-dm text-[7.5px] tracking-[2px] text-reaper-dim mt-0.5">
              {user.plan_tier.toUpperCase()} PLAN
            </div>
          </div>
        </div>
      </div>

      {/* Shop selector */}
      {shops.length > 0 && (
        <div className="px-4 py-3 border-b border-reaper-border">
          <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim mb-2">CONNECTED SHOP</div>
          <select
            defaultValue={activeShopId}
            className="w-full bg-reaper-bg3 border border-reaper-border rounded px-2.5 py-1.5 text-xs text-reaper-muted font-mono-dm focus:outline-none focus:border-reaper-dim"
          >
            {shops.map((s) => (
              <option key={s.id} value={s.id}>{s.shop_name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 flex flex-col gap-0.5">
        {NAV.map(({ href, icon, label }) => {
          const active = path === href || (href !== "/dashboard" && path.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md transition-all duration-150",
                "font-mono-dm text-[10px] tracking-[1.5px]",
                active
                  ? "bg-[#1C0000] text-reaper-red border border-reaper-red border-opacity-30"
                  : "text-reaper-dim hover:text-reaper-muted hover:bg-reaper-bg3"
              )}
            >
              <span className="text-base leading-none">{icon}</span>
              {label.toUpperCase()}
            </Link>
          );
        })}
      </nav>

      {/* Bottom: upgrade CTA or user */}
      <div className="px-4 py-4 border-t border-reaper-border">
        {user.plan_tier === "basic" && (
          <Link
            href="/pricing"
            className="block w-full bg-reaper-red text-white text-center font-mono-dm text-[9px] tracking-[2px] py-2.5 rounded mb-3 hover:shadow-[0_0_20px_rgba(217,26,15,0.4)] transition-all"
          >
            UPGRADE TO REAPER ↑
          </Link>
        )}
        <div className="text-[10px] text-reaper-dim font-mono-dm truncate">{user.email}</div>
      </div>
    </aside>
  );
}
