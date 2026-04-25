"use client";
import { useEffect, useState } from "react";
import type { ShopRisk } from "@/types";

interface SpsGaugeProps {
  score: number;
  risk: ShopRisk;
  size?: number;
}

const RISK_COLORS: Record<ShopRisk, string> = {
  safe:       "#00B85A",
  warning:    "#E07000",
  critical:   "#D91A0F",
  restricted: "#880000",
};

const RISK_LABELS: Record<ShopRisk, string> = {
  safe:       "SAFE",
  warning:    "WARNING",
  critical:   "CRITICAL",
  restricted: "RESTRICTED",
};

export function SpsGauge({ score, risk, size = 160 }: SpsGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timeout = setTimeout(() => setAnimatedScore(score), 100);
    return () => clearTimeout(timeout);
  }, [score]);

  const color  = RISK_COLORS[risk];
  const cx     = size / 2;
  const cy     = size / 2;
  const r      = (size / 2) - 14;
  const circ   = 2 * Math.PI * r;
  const arc    = circ * 0.75; // 270-degree sweep
  const offset = arc * (1 - animatedScore / 5);

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width={size} height={size * 0.85} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#D91A0F" />
            <stop offset="50%"  stopColor="#E07000" />
            <stop offset="100%" stopColor="#00B85A" />
          </linearGradient>
          <filter id="gauge-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* Background track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#1a1a1a" strokeWidth={10}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />

        {/* Active arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth={10}
          strokeDasharray={`${arc - offset} ${circ - (arc - offset)}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          filter="url(#gauge-glow)"
          style={{ transition: "stroke-dasharray 1.2s cubic-bezier(0.34,1.56,0.64,1)" }}
        />

        {/* Score */}
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          fill={color}
          fontSize={size * 0.175}
          fontFamily="var(--font-bebas)"
          fontWeight="700"
          style={{ transition: "fill 0.5s ease" }}
        >
          {animatedScore.toFixed(1)}
        </text>

        {/* Label */}
        <text
          x={cx} y={cy + 18}
          textAnchor="middle"
          fill="#555"
          fontSize={10}
          fontFamily="var(--font-dm-mono)"
          letterSpacing="2"
        >
          SPS SCORE
        </text>
      </svg>

      {/* Risk badge */}
      <div
        className="font-mono-dm text-[9px] tracking-[3px] px-3 py-1 rounded-sm border"
        style={{
          color,
          borderColor: color,
          backgroundColor: color + "18",
          animation: risk === "critical" || risk === "restricted" ? "pulse-red 2s infinite" : "none",
        }}
      >
        {RISK_LABELS[risk]}
      </div>
    </div>
  );
}
