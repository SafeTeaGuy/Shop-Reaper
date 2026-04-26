import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ReaperCoach } from "@/components/dashboard/ReaperCoach";
import { Card, SectionLabel } from "@/components/ui";

export default async function CoachPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const [{ data: shop }, { data: userData }] = await Promise.all([
    supabase.from("shops").select("id, shop_name").eq("user_id", authUser.id)
      .eq("is_active", true).single(),
    supabase.from("users").select("plan_tier").eq("id", authUser.id).single(),
  ]);

  if (!shop) redirect("/dashboard");

  return (
    <div className="p-6 max-w-4xl h-screen flex flex-col">
      <div className="mb-4">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">AI Layer</div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">REAPER COACH</h1>
        <p className="text-reaper-muted text-sm mt-1">
          Claude AI trained on your live shop data. Ask anything. Get brutal honesty.
        </p>
      </div>

      <Card className="flex-1 min-h-0 p-4 flex flex-col">
        <SectionLabel>Live Shop Data Injected · {shop.shop_name}</SectionLabel>
        <div className="flex-1 min-h-0">
          <ReaperCoach shopId={shop.id} planTier={userData?.plan_tier ?? "basic"} />
        </div>
      </Card>
    </div>
  );
}
