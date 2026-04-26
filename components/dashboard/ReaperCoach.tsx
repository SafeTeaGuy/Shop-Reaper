"use client";
import { useState, useRef, useEffect } from "react";
import type { CoachMessage } from "@/types";
import { Button, cn } from "@/components/ui";
import { COACH_PROMPTS } from "@/lib/reaper/coach";
import ReactMarkdown from "react-markdown";

interface ReaperCoachProps {
  shopId: string;
  planTier: string;
}

export function ReaperCoach({ shopId, planTier }: ReaperCoachProps) {
  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      role: "assistant",
      content: "Shop connected. I've analysed your metrics. Ask me anything — or pick a prompt below to start.",
      created_at: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const isLocked = planTier === "basic";

  async function send(text: string) {
    if (!text.trim() || isStreaming) return;
    setInput("");

    const userMsg: CoachMessage = {
      role: "user",
      content: text,
      created_at: new Date().toISOString(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    // Placeholder for assistant response
    const assistantMsg: CoachMessage = {
      role: "assistant",
      content: "",
      created_at: new Date().toISOString(),
    };
    setMessages([...newMessages, assistantMsg]);

    try {
      const res = await fetch("/api/reaper/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopId,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...assistantMsg, content: `Error: ${err}` },
        ]);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((prev) => [
          ...prev.slice(0, -1),
          { ...assistantMsg, content: full },
        ]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Suggested prompts */}
      <div className="flex gap-2 flex-wrap mb-3">
        {COACH_PROMPTS.slice(0, 4).map((p) => (
          <button
            key={p}
            onClick={() => !isLocked && send(p)}
            className={cn(
              "text-[10px] font-mono-dm tracking-wider px-3 py-1.5 rounded-full border transition-all",
              isLocked
                ? "border-reaper-border text-reaper-dim cursor-not-allowed opacity-50"
                : "border-reaper-border2 text-reaper-muted hover:border-reaper-dim hover:text-reaper-text"
            )}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-3 pr-1">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn(
              "flex gap-2.5 animate-slide-up",
              msg.role === "user" && "flex-row-reverse"
            )}
          >
            {msg.role === "assistant" && (
              <div className="w-7 h-7 rounded-md bg-[#1C0000] border border-reaper-red flex items-center justify-center text-sm flex-shrink-0 mt-0.5">
                💀
              </div>
            )}
            <div className={cn(
              "rounded-lg px-3.5 py-2.5 max-w-[82%] text-xs leading-relaxed",
              msg.role === "user"
                ? "bg-[#0d0d1a] border border-[#2a2a4a] text-reaper-muted"
                : "bg-reaper-bg2 border border-reaper-border text-reaper-text"
            )}>
              {msg.role === "assistant" ? (
                <div className="prose prose-invert prose-sm max-w-none
                  prose-strong:text-reaper-orange prose-strong:font-semibold
                  prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5
                  prose-ol:my-1.5 prose-headings:text-reaper-text">
                  <ReactMarkdown>{msg.content || (isStreaming && i === messages.length - 1 ? "▊" : "")}</ReactMarkdown>
                </div>
              ) : (
                msg.content
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {isLocked ? (
        <div className="mt-3 bg-[#1C0000] border border-reaper-red rounded-lg p-3 text-center">
          <div className="text-xs text-reaper-red font-semibold mb-1">Reaper Coach is a Reaper+ feature</div>
          <div className="text-[10px] text-reaper-dim mb-2">Upgrade to get personalized AI analysis of your shop data.</div>
          <Button size="sm" variant="primary" onClick={() =>
            fetch("/api/stripe/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tier: "reaper" }),
            }).then((r) => r.json()).then((d) => window.location.href = d.url)
          }>
            Upgrade to Reaper — $49/mo
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send(input)}
            placeholder="Ask Reaper anything about your shop…"
            disabled={isStreaming}
            className={cn(
              "flex-1 bg-reaper-bg3 border border-reaper-border rounded-lg px-4 py-2.5",
              "text-sm text-reaper-text placeholder:text-reaper-dim",
              "focus:outline-none focus:border-reaper-dim transition-colors",
              "font-mono-dm disabled:opacity-50"
            )}
          />
          <Button
            variant="primary"
            size="md"
            onClick={() => send(input)}
            loading={isStreaming}
            disabled={!input.trim()}
          >
            SEND
          </Button>
        </div>
      )}
    </div>
  );
}
