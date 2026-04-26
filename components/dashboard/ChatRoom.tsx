"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ChatGroup, ChatMessage } from "@/types";

interface Props {
  groups:        ChatGroup[];
  initialGroup:  ChatGroup;
  initialMessages: ChatMessage[];
  displayName:   string;
  avatarSeed:    string;
  userId:        string;
}

export function ChatRoom({ groups, initialGroup, initialMessages, displayName, avatarSeed, userId }: Props) {
  const supabase = createClient();

  const [activeGroup, setActiveGroup] = useState<ChatGroup>(initialGroup);
  const [messages, setMessages]       = useState<ChatMessage[]>(initialMessages);
  const [draft, setDraft]             = useState("");
  const [sending, setSending]         = useState(false);
  const [loadingGroup, setLoadingGroup] = useState(false);
  const bottomRef  = useRef<HTMLDivElement>(null);
  const inputRef   = useRef<HTMLTextAreaElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to realtime for the active group
  useEffect(() => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const ch = supabase
      .channel(`chat:${activeGroup.id}`)
      .on(
        "postgres_changes",
        {
          event:  "INSERT",
          schema: "public",
          table:  "chat_messages",
          filter: `group_id=eq.${activeGroup.id}`,
        },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => {
            // deduplicate optimistic message
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [activeGroup.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchGroup = useCallback(async (group: ChatGroup) => {
    setActiveGroup(group);
    setLoadingGroup(true);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("group_id", group.id)
      .order("created_at", { ascending: true })
      .limit(100);
    setMessages((data ?? []) as ChatMessage[]);
    setLoadingGroup(false);
  }, [supabase]);

  const send = useCallback(async () => {
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setDraft("");

    const optimisticId = `opt-${Date.now()}`;
    const optimistic: ChatMessage = {
      id: optimisticId, group_id: activeGroup.id, user_id: userId,
      display_name: displayName, avatar_seed: avatarSeed,
      body, created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("chat_messages").insert({
      group_id:     activeGroup.id,
      user_id:      userId,
      display_name: displayName,
      avatar_seed:  avatarSeed,
      body,
    });

    if (error) {
      // Remove optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setDraft(body);
    }

    setSending(false);
    inputRef.current?.focus();
  }, [draft, sending, activeGroup.id, userId, displayName, avatarSeed, supabase]);

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="flex h-[calc(100vh-88px)] overflow-hidden rounded-lg border border-reaper-border">
      {/* ── Group list ─────────────────────────────────── */}
      <aside className="w-52 shrink-0 bg-reaper-bg2 border-r border-reaper-border flex flex-col">
        <div className="px-4 py-3 border-b border-reaper-border">
          <div className="font-mono-dm text-[7px] tracking-[3px] text-reaper-dim uppercase">Channels</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {groups.map((g) => {
            const active = g.id === activeGroup.id;
            return (
              <button
                key={g.id}
                onClick={() => switchGroup(g)}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-2.5 transition-colors ${
                  active
                    ? "bg-[#1C0000] text-reaper-red"
                    : "text-reaper-dim hover:text-reaper-muted hover:bg-reaper-bg3"
                }`}
              >
                <span className="text-base leading-none shrink-0">{g.icon}</span>
                <div className="min-w-0">
                  <div className={`font-mono-dm text-[9px] tracking-[1px] truncate ${active ? "text-reaper-red" : ""}`}>
                    {g.name}
                  </div>
                </div>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Messages ───────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-reaper-bg min-w-0">
        {/* Header */}
        <div className="px-5 py-3 border-b border-reaper-border flex items-center gap-3 shrink-0">
          <span className="text-xl leading-none">{activeGroup.icon}</span>
          <div>
            <div className="font-mono-dm text-[10px] tracking-[1.5px] text-reaper-text">{activeGroup.name}</div>
            {activeGroup.description && (
              <div className="font-mono-dm text-[8px] text-reaper-dim mt-0.5">{activeGroup.description}</div>
            )}
          </div>
        </div>

        {/* Message list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
          {loadingGroup ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="font-mono-dm text-[9px] text-reaper-dim animate-pulse">Loading…</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
              <div className="text-4xl">{activeGroup.icon}</div>
              <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim">NO MESSAGES YET</div>
              <div className="text-reaper-dim text-xs">Be the first to say something.</div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => {
                const isMe = msg.user_id === userId;
                const prevMsg = messages[i - 1];
                const sameAuthor = prevMsg?.user_id === msg.user_id
                  && new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() < 5 * 60 * 1000;

                return (
                  <div key={msg.id} className={`flex gap-3 ${isMe ? "flex-row-reverse" : ""} ${sameAuthor ? "mt-0.5" : "mt-2"}`}>
                    {/* Avatar */}
                    {!sameAuthor && (
                      <div
                        className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                        style={{ background: avatarColor(msg.avatar_seed ?? msg.user_id) }}
                      >
                        {(msg.display_name?.[0] ?? "?").toUpperCase()}
                      </div>
                    )}
                    {sameAuthor && <div className="w-7 shrink-0" />}

                    <div className={`flex flex-col ${isMe ? "items-end" : "items-start"} max-w-[70%]`}>
                      {!sameAuthor && (
                        <div className={`flex items-baseline gap-2 mb-0.5 ${isMe ? "flex-row-reverse" : ""}`}>
                          <span className="font-mono-dm text-[8px] text-reaper-muted">{isMe ? "You" : msg.display_name}</span>
                          <span className="font-mono-dm text-[7px] text-reaper-dim">
                            {formatTime(msg.created_at)}
                          </span>
                        </div>
                      )}
                      <div
                        className={`px-3 py-2 rounded-lg text-sm leading-relaxed break-words ${
                          isMe
                            ? "bg-reaper-red text-white rounded-tr-none"
                            : "bg-reaper-bg2 border border-reaper-border text-reaper-text rounded-tl-none"
                        } ${msg.id.startsWith("opt-") ? "opacity-60" : ""}`}
                      >
                        {msg.body}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="px-5 py-3 border-t border-reaper-border shrink-0">
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onKeyDown}
              rows={1}
              placeholder={`Message #${activeGroup.name.toLowerCase()}…`}
              maxLength={2000}
              className="flex-1 bg-reaper-bg2 border border-reaper-border rounded-lg px-3 py-2.5 text-sm text-reaper-text placeholder:text-reaper-dim focus:outline-none focus:border-reaper-dim font-mono-dm resize-none min-h-[42px] max-h-32"
              style={{ fieldSizing: "content" } as React.CSSProperties}
            />
            <button
              onClick={send}
              disabled={!draft.trim() || sending}
              className="shrink-0 h-[42px] px-4 bg-reaper-red text-white font-mono-dm text-[9px] tracking-[2px] rounded-lg hover:shadow-[0_0_16px_rgba(217,26,15,0.4)] disabled:opacity-40 transition-all"
            >
              {sending ? "…" : "SEND"}
            </button>
          </div>
          <div className="font-mono-dm text-[7px] text-reaper-dim mt-1.5">
            Enter to send · Shift+Enter for new line · {draft.length}/2000
          </div>
        </div>
      </div>
    </div>
  );
}

// Deterministic pastel-ish color from a seed string
function avatarColor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 55%, 38%)`;
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
