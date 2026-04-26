import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom } from "@/components/dashboard/ChatRoom";
import type { ChatGroup, ChatMessage } from "@/types";

export default async function ChatPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  // Get the user's shop for display name
  const [shopRes, groupsRes] = await Promise.all([
    supabase
      .from("shops")
      .select("id, shop_name, tiktok_handle")
      .eq("user_id", authUser.id)
      .eq("is_active", true)
      .order("connected_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("chat_groups")
      .select("*")
      .eq("is_public", true)
      .order("sort_order", { ascending: true }),
  ]);

  const groups = (groupsRes.data ?? []) as ChatGroup[];

  // Derive display name: prefer shop name, fall back to email prefix
  const displayName =
    shopRes.data?.shop_name ??
    shopRes.data?.tiktok_handle ??
    authUser.email?.split("@")[0] ??
    "Seller";

  const avatarSeed = shopRes.data?.id ?? authUser.id;

  if (groups.length === 0) {
    return (
      <div className="p-6 max-w-4xl">
        <h1 className="font-display text-3xl tracking-wider text-reaper-text mb-2">COMMUNITY CHAT</h1>
        <p className="text-reaper-muted text-sm">Chat groups are being set up. Run migration 005_chat.sql to enable this feature.</p>
      </div>
    );
  }

  // Load initial messages for the first group
  const firstGroup = groups[0];
  const { data: initialMessages } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("group_id", firstGroup.id)
    .order("created_at", { ascending: true })
    .limit(100);

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-5">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">
          {displayName}
        </div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">COMMUNITY CHAT</h1>
        <p className="text-reaper-muted text-sm mt-1">
          Connect with other sellers, affiliates, and co-op members in real time.
        </p>
      </div>

      <ChatRoom
        groups={groups}
        initialGroup={firstGroup}
        initialMessages={(initialMessages ?? []) as ChatMessage[]}
        displayName={displayName}
        avatarSeed={avatarSeed}
        userId={authUser.id}
      />
    </div>
  );
}
