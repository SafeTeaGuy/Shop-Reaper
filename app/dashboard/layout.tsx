import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/dashboard/Sidebar";
import type { User, Shop } from "@/types";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [{ data: user }, { data: shops }] = await Promise.all([
    supabase.from("users").select("*").eq("id", authUser.id).single(),
    supabase.from("shops").select("*").eq("user_id", authUser.id).eq("is_active", true),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen bg-reaper-bg">
      <Sidebar
        user={user as User}
        shops={(shops ?? []) as Shop[]}
        activeShopId={shops?.[0]?.id}
      />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
