"use client";
import { useState } from "react";
import { Card, Button, SectionLabel } from "@/components/ui";
import { cn } from "@/components/ui";

interface ScriptBeat {
  time: string;
  text: string;
  note: string;
}
interface BRollShot {
  shot: string;
  note: string;
}
interface GeneratedScript {
  beats: ScriptBeat[];
  broll: BRollShot[];
  caption: string;
}

type ScriptTab = "script" | "broll" | "caption";

const HOOK_STYLES = ["Sacrifice Hook", "POV Hook", "Social Proof", "Contrast Hook", "Problem Hook"];
const VIDEO_LENGTHS = ["15 seconds", "30 seconds", "60 seconds"];
const NICHES = ["Fashion / Apparel", "Beauty / Skincare", "Fitness / Health", "Home / Lifestyle", "Tech / Gadgets"];
const TONES = ["Authentic / Raw", "Hype / Energetic", "Educational", "Luxury / Aspirational"];

export default function ScriptsPage() {
  const [prodName, setProdName]   = useState("No Days Off Shorts");
  const [length, setLength]       = useState("30 seconds");
  const [hookStyle, setHookStyle] = useState("POV Hook");
  const [niche, setNiche]         = useState("Fashion / Apparel");
  const [tone, setTone]           = useState("Authentic / Raw");
  const [keyPoint, setKeyPoint]   = useState("4.1% CVR this month, keeps selling out");
  const [loading, setLoading]     = useState(false);
  const [script, setScript]       = useState<GeneratedScript | null>(null);
  const [activeTab, setActiveTab] = useState<ScriptTab>("script");
  const [copied, setCopied]       = useState(false);
  const [streamedText, setStreamedText] = useState("");

  async function generateScript() {
    if (!prodName.trim()) return;
    setLoading(true);
    setScript(null);
    setStreamedText("");

    try {
      const res = await fetch("/api/creator/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prodName, length, hookStyle, niche, tone, keyPoint }),
      });

      if (!res.ok) throw new Error("Generation failed");

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamedText(full);
      }

      // Parse JSON from streamed response
      const clean = full.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(clean) as GeneratedScript;
      setScript(parsed);
      setStreamedText("");
    } catch {
      // Fallback to mock script
      setScript(getMockScript(prodName, hookStyle));
    } finally {
      setLoading(false);
    }
  }

  function getMockScript(name: string, hook: string): GeneratedScript {
    return {
      beats: [
        { time: "0:00 – 0:03", text: `POV: You're still sleeping on the ${name} that sold out twice this month.`, note: "HOOK — tight crop on product, slow reveal. No talking yet." },
        { time: "0:03 – 0:10", text: `Okay so I've been wearing these for two weeks straight and I genuinely cannot go back.`, note: "Talking head — authentic, slightly disheveled. Real energy." },
        { time: "0:10 – 0:18", text: `The fit is insane, the quality holds up after washing, and they're actually affordable.`, note: "B-roll multiple angles. Quick cuts." },
        { time: "0:18 – 0:25", text: `I've spent way more on alternatives that don't come close. The difference is real.`, note: "Comparison shot if possible, or just demonstrate quality." },
        { time: "0:25 – 0:30", text: `Link is in my bio — they keep selling out so grab them now. My code gets you free shipping.`, note: "CTA — direct eye contact, point to bio." },
      ],
      broll: [
        { shot: "Opening hero shot", note: "Tight crop on product. Slow upward reveal. Natural light." },
        { shot: "Movement / quality test", note: "Show the product in action — movement, stretch, texture. 5 seconds." },
        { shot: "Fabric / material close-up", note: "Extreme close-up showing quality, stitching, texture." },
        { shot: "Lifestyle context shot", note: "Wearing/using in a real environment. Gym, outside, daily life." },
        { shot: "CTA frame", note: "Camera on face, pointing up or at camera. Bio link visible if filming at home." },
      ],
      caption: `POV: you found the one that actually holds up 💀\n\nI've been testing this for 2 weeks and I can't stop. Quality is insane for the price.\n\nLink in bio — keeps selling out so grab it now 👇\n\n#TikTokShop #${name.replace(/\s+/g, "")} #TikTokMadeMeBuyIt #FitTok #CreatorReaper`,
    };
  }

  function copyContent() {
    if (!script) return;
    const tab = activeTab;
    let text = "";
    if (tab === "script") {
      text = script.beats.map(b => `[${b.time}]\n"${b.text}"\n📹 ${b.note}`).join("\n\n");
    } else if (tab === "broll") {
      text = script.broll.map((b, i) => `Shot ${i + 1}: ${b.shot}\n${b.note}`).join("\n\n");
    } else {
      text = script.caption;
    }
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">Claude AI · TikTok Format</div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">AI SCRIPT GENERATOR</h1>
        <p className="text-reaper-muted text-sm mt-1">Product data in. Full TikTok script out. Hooks, CTA, B-roll notes included.</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Form */}
        <Card accent="pink" className="p-4">
          <SectionLabel className="text-[#FF2D78]">Script Parameters</SectionLabel>
          <div className="flex flex-col gap-3">
            <div>
              <div className="font-mono-dm text-[8.5px] tracking-[2px] text-reaper-dim uppercase mb-1.5">Product Name</div>
              <input
                value={prodName}
                onChange={e => setProdName(e.target.value)}
                className="w-full bg-reaper-bg3 border border-reaper-border rounded-lg px-3 py-2.5 text-sm text-reaper-text focus:outline-none focus:border-[#FF2D78] transition-colors"
                placeholder="e.g. No Days Off Shorts"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Video Length", val: length, set: setLength, opts: VIDEO_LENGTHS },
                { label: "Hook Style",   val: hookStyle, set: setHookStyle, opts: HOOK_STYLES },
                { label: "Niche",        val: niche, set: setNiche, opts: NICHES },
                { label: "Tone",         val: tone, set: setTone, opts: TONES },
              ].map(({ label, val, set, opts }) => (
                <div key={label}>
                  <div className="font-mono-dm text-[8.5px] tracking-[2px] text-reaper-dim uppercase mb-1.5">{label}</div>
                  <select
                    value={val}
                    onChange={e => set(e.target.value)}
                    className="w-full bg-reaper-bg3 border border-reaper-border rounded-lg px-3 py-2.5 text-sm text-reaper-text focus:outline-none focus:border-[#FF2D78] transition-colors"
                  >
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div>
              <div className="font-mono-dm text-[8.5px] tracking-[2px] text-reaper-dim uppercase mb-1.5">Key Selling Point</div>
              <input
                value={keyPoint}
                onChange={e => setKeyPoint(e.target.value)}
                className="w-full bg-reaper-bg3 border border-reaper-border rounded-lg px-3 py-2.5 text-sm text-reaper-text focus:outline-none focus:border-[#FF2D78] transition-colors"
                placeholder="e.g. bestseller, limited stock, 4.1% CVR..."
              />
            </div>

            <Button
              variant="primary"
              size="lg"
              loading={loading}
              onClick={generateScript}
              disabled={!prodName.trim()}
              className="w-full bg-[#FF2D78] hover:shadow-[0_0_20px_rgba(255,45,120,0.4)]"
            >
              ⚡ GENERATE SCRIPT →
            </Button>
          </div>
        </Card>

        {/* Output */}
        <div>
          {!script && !loading && !streamedText && (
            <Card className="p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="text-5xl mb-4">🎬</div>
              <div className="font-display text-2xl tracking-wider text-reaper-text mb-2">READY TO GENERATE</div>
              <div className="text-sm text-reaper-dim max-w-xs">Fill in the parameters and hit Generate. Full script with timing, B-roll notes, and caption in seconds.</div>
            </Card>
          )}

          {(loading && streamedText) && (
            <Card className="p-4">
              <div className="font-mono-dm text-[8px] tracking-[2px] text-[#FF2D78] mb-3">⚡ GENERATING...</div>
              <div className="text-xs text-reaper-muted font-mono-dm leading-relaxed whitespace-pre-wrap">
                {streamedText}
                <span className="inline-block w-0.5 h-3.5 bg-[#FF2D78] animate-pulse ml-0.5 align-middle" />
              </div>
            </Card>
          )}

          {loading && !streamedText && (
            <Card className="p-12 text-center h-full flex flex-col items-center justify-center">
              <div className="flex gap-1.5 mb-4">
                {[0,1,2].map(i => (
                  <div key={i} className="w-2 h-2 rounded-full bg-[#FF2D78] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
              <div className="font-mono-dm text-[10px] tracking-[2px] text-reaper-dim">GENERATING SCRIPT...</div>
            </Card>
          )}

          {script && (
            <Card accent="pink" className="overflow-hidden animate-slide-up">
              {/* Tabs */}
              <div className="flex border-b border-reaper-border">
                {(["script", "broll", "caption"] as ScriptTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={cn(
                      "px-4 py-2.5 font-mono-dm text-[9px] tracking-[1px] border-b-2 transition-all",
                      activeTab === tab
                        ? "text-[#FF2D78] border-[#FF2D78]"
                        : "text-reaper-dim border-transparent hover:text-reaper-muted"
                    )}
                  >
                    {tab.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Script tab */}
              {activeTab === "script" && (
                <div className="p-4">
                  {script.beats.map((beat, i) => (
                    <div key={i} className="mb-4 pb-4 border-b border-reaper-border last:border-b-0 last:mb-0 last:pb-0">
                      <div className="font-mono-dm text-[8.5px] text-[#FF2D78] mb-1.5">{beat.time}</div>
                      <div className="text-sm text-reaper-text leading-relaxed mb-1.5">&ldquo;{beat.text}&rdquo;</div>
                      <div className="text-xs text-reaper-dim italic">📹 {beat.note}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* B-roll tab */}
              {activeTab === "broll" && (
                <div className="p-4 flex flex-col gap-2.5">
                  {script.broll.map((shot, i) => (
                    <div key={i} className="bg-reaper-bg3 border border-reaper-border rounded-lg p-3">
                      <div className="font-mono-dm text-[8.5px] text-[#FF2D78] mb-1">SHOT {i + 1}</div>
                      <div className="text-sm font-semibold text-reaper-text mb-1">{shot.shot}</div>
                      <div className="text-xs text-reaper-muted">{shot.note}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Caption tab */}
              {activeTab === "caption" && (
                <div className="p-4">
                  <div className="bg-reaper-bg3 border border-reaper-border rounded-lg p-3 text-sm text-reaper-text leading-relaxed whitespace-pre-line mb-3">
                    {script.caption}
                  </div>
                </div>
              )}

              {/* Copy button */}
              <div className="px-4 pb-4">
                <button
                  onClick={copyContent}
                  className={cn(
                    "w-full border border-reaper-border2 font-mono-dm text-[9px] tracking-[1.5px] py-2.5 rounded transition-all",
                    copied
                      ? "border-[#FF2D78] text-[#FF2D78]"
                      : "text-reaper-muted hover:border-[#FF2D78] hover:text-[#FF2D78]"
                  )}
                >
                  {copied ? "✓ COPIED TO CLIPBOARD" : `📋 COPY ${activeTab.toUpperCase()}`}
                </button>
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
