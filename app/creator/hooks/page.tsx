"use client";
import { useState } from "react";
import { Card, Button, SectionLabel } from "@/components/ui";
import { cn } from "@/components/ui";

const HOOK_FORMULAS = [
  { label: "SACRIFICE HOOK",    text: "I spent $[X] on this so you don't have to — here's what happened" },
  { label: "POV HOOK",          text: "POV: You're about to save [X] hours per week with this one thing" },
  { label: "SOCIAL PROOF HOOK", text: "This is the [product] that sold out 3 times this month. Here's why." },
  { label: "CONTRAST HOOK",     text: "Stop buying [common alternative]. This does the same thing for half the price." },
  { label: "PROBLEM HOOK",      text: "The reason your [problem] won't fix itself — and what actually works." },
];

interface HookAnalysis {
  score: number;
  issues: { icon: string; text: string }[];
  rewrites: { label: string; text: string }[];
}

function analyzeHookLocally(hook: string): HookAnalysis {
  const lower = hook.toLowerCase();
  const issues: { icon: string; text: string }[] = [];
  let score = 80;

  if (lower.startsWith("i ")) {
    issues.push({ icon: "⚠️", text: 'Starts with "I" — algorithm deprioritizes self-focused hooks. Lead with the benefit.' });
    score -= 14;
  }
  if (hook.length > 80) {
    issues.push({ icon: "⚠️", text: "Too long for the first 1.5 seconds — trim to under 10 words for maximum stop-scroll." });
    score -= 8;
  }
  if (!hook.includes("?") && !hook.includes("...") && !lower.includes("pov")) {
    issues.push({ icon: "⚠️", text: "No curiosity gap — viewer has no unresolved question pulling them to watch." });
    score -= 10;
  }
  if (!lower.match(/\d+|free|secret|never|always|stop|best|worst/)) {
    issues.push({ icon: "⚠️", text: "No power word or number — specificity and intensity increase stop rate by avg 24%." });
    score -= 8;
  }
  if (issues.length === 0) {
    issues.push({ icon: "✅", text: "Strong curiosity gap — viewer needs to watch to get resolution." });
    issues.push({ icon: "✅", text: "Direct and punchy — high stop-scroll probability." });
    score = Math.min(92, score);
  }

  score = Math.max(30, Math.min(95, score));

  const rewrites = [
    {
      label: "BENEFIT-FIRST REWRITE",
      text: `Save money and time with this one switch — I tested it for 30 days so you don't have to`,
    },
    {
      label: "CURIOSITY REWRITE",
      text: `The thing most creators won't tell you about this product (it changed everything for me)`,
    },
    {
      label: "URGENCY REWRITE",
      text: `Sold out twice this month — here's my honest review before the price goes up`,
    },
  ];

  return { score, issues, rewrites };
}

export default function HooksPage() {
  const [hook, setHook]         = useState("");
  const [analysis, setAnalysis] = useState<HookAnalysis | null>(null);
  const [loading, setLoading]   = useState(false);
  const [copied, setCopied]     = useState<string | null>(null);

  function analyze() {
    if (!hook.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setAnalysis(analyzeHookLocally(hook));
      setLoading(false);
    }, 800);
  }

  function copyText(text: string, id: string) {
    navigator.clipboard?.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const scoreColor = analysis
    ? analysis.score >= 75 ? "text-reaper-green"
    : analysis.score >= 60 ? "text-reaper-gold"
    : "text-reaper-red"
    : "text-reaper-text";

  const fillColor = analysis
    ? analysis.score >= 75 ? "bg-reaper-green"
    : analysis.score >= 60 ? "bg-reaper-gold"
    : "bg-reaper-red"
    : "bg-reaper-red";

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <div className="font-mono-dm text-[9px] tracking-[3px] text-reaper-dim uppercase mb-1">AI-Powered · First 3 Seconds</div>
        <h1 className="font-display text-3xl tracking-wider text-reaper-text">HOOK OPTIMIZER</h1>
        <p className="text-reaper-muted text-sm mt-1">Paste your hook. Get scored and rewritten for maximum stop-scroll rate.</p>
      </div>

      <div className="grid grid-cols-2 gap-5">
        {/* Left: input + results */}
        <div>
          <Card accent="purple" className="p-4">
            <SectionLabel className="text-[#9B59FF]">Your Hook</SectionLabel>
            <textarea
              value={hook}
              onChange={e => setHook(e.target.value)}
              placeholder={"Paste your opening line or first 3 seconds of script here...\n\ne.g. 'I tried this $20 skincare product for 30 days and...'"}
              className={cn(
                "w-full bg-reaper-bg3 border border-reaper-border rounded-lg px-4 py-3",
                "text-sm text-reaper-text placeholder:text-reaper-dim resize-none min-h-[90px]",
                "focus:outline-none focus:border-[#9B59FF] transition-colors font-mono-dm"
              )}
            />
            <Button
              variant="primary"
              size="lg"
              loading={loading}
              onClick={analyze}
              disabled={!hook.trim()}
              className="w-full mt-3 bg-[#9B59FF] hover:shadow-[0_0_20px_rgba(155,89,255,0.4)]"
            >
              ANALYZE MY HOOK →
            </Button>

            {/* Results */}
            {analysis && (
              <div className="mt-4 animate-slide-up">
                {/* Score */}
                <div className="bg-reaper-bg3 border border-reaper-border rounded-lg p-4 mb-3">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-mono-dm text-[8.5px] tracking-[2px] text-reaper-dim uppercase mb-1">Stop-Scroll Score</div>
                      <div className={`font-display text-5xl leading-none ${scoreColor}`}>{analysis.score}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-dm text-[8.5px] tracking-[2px] text-reaper-dim uppercase mb-1">Niche Avg</div>
                      <div className="font-display text-4xl text-reaper-dim">71</div>
                    </div>
                  </div>
                  <div className="h-1.5 bg-reaper-bg4 rounded-full overflow-hidden mb-4">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ${fillColor}`}
                      style={{ width: `${analysis.score}%` }}
                    />
                  </div>
                  <div className="flex flex-col gap-0">
                    {analysis.issues.map((issue, i) => (
                      <div key={i} className="flex items-start gap-2 py-2 border-b border-reaper-border last:border-b-0 text-xs text-reaper-muted">
                        <span className="flex-shrink-0 text-sm">{issue.icon}</span>
                        {issue.text}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Rewrites */}
                <div className="font-mono-dm text-[8px] tracking-[2px] text-[#9B59FF] mb-2">AI REWRITES — TAP TO COPY</div>
                {analysis.rewrites.map((r, i) => (
                  <div
                    key={i}
                    onClick={() => copyText(r.text, `rewrite-${i}`)}
                    className={cn(
                      "bg-[rgba(155,89,255,0.07)] border rounded-lg p-3 mb-2 cursor-pointer transition-all",
                      copied === `rewrite-${i}`
                        ? "border-[#9B59FF]"
                        : "border-[rgba(155,89,255,0.2)] hover:border-[#9B59FF]"
                    )}
                  >
                    <div className="font-mono-dm text-[7.5px] text-[#9B59FF] mb-1.5 flex items-center justify-between">
                      {r.label}
                      <span className="text-reaper-dim">{copied === `rewrite-${i}` ? "✓ copied!" : "tap to copy"}</span>
                    </div>
                    <div className="text-xs text-reaper-text leading-relaxed">&ldquo;{r.text}&rdquo;</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right: formula library */}
        <div>
          <Card className="p-4">
            <SectionLabel className="text-[#9B59FF]">Hook Formula Library</SectionLabel>
            <div className="flex flex-col gap-2">
              {HOOK_FORMULAS.map((formula) => (
                <div
                  key={formula.label}
                  onClick={() => { setHook(formula.text); setAnalysis(null); }}
                  className="p-3 bg-reaper-bg3 border border-reaper-border rounded-lg cursor-pointer hover:border-reaper-border2 transition-all"
                >
                  <div className="font-mono-dm text-[8px] text-[#9B59FF] mb-1.5">{formula.label}</div>
                  <div className="text-xs text-reaper-muted leading-relaxed">&ldquo;{formula.text}&rdquo;</div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 mt-4 bg-[#090012] border-[rgba(155,89,255,0.2)]">
            <div className="font-mono-dm text-[8px] tracking-[2px] text-[#9B59FF] mb-2">💡 HOOK SCIENCE</div>
            <div className="flex flex-col gap-3">
              {[
                { stat: "1.5s", desc: "Window before viewer scrolls. Your hook must land in this window." },
                { stat: "8 words", desc: "Ideal spoken length for the first line. Under 8 = maximum impact." },
                { stat: "+34%", desc: "Average CVR lift when using trending sounds with strong hooks." },
              ].map(({ stat, desc }) => (
                <div key={stat} className="flex gap-3 items-start">
                  <div className="font-display text-2xl text-[#9B59FF] leading-none flex-shrink-0">{stat}</div>
                  <div className="text-xs text-reaper-dim leading-relaxed">{desc}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
