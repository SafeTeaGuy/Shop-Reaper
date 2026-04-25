import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── BADGE ─────────────────────────────────────
interface BadgeProps {
  variant?: "critical" | "warning" | "info" | "safe" | "ghost";
  children: React.ReactNode;
  className?: string;
  pulse?: boolean;
}

export function Badge({ variant = "ghost", children, className, pulse }: BadgeProps) {
  const styles = {
    critical: "bg-[#1C0000] border-reaper-red text-reaper-red",
    warning:  "bg-[#1C0E00] border-reaper-orange text-reaper-orange",
    info:     "bg-[#001422] border-sky-400 text-sky-400",
    safe:     "bg-[#001409] border-reaper-green text-reaper-green",
    ghost:    "bg-reaper-bg3 border-reaper-border text-reaper-muted",
  };

  return (
    <span className={cn(
      "inline-flex items-center border rounded-sm px-2 py-0.5",
      "font-mono-dm text-[8px] tracking-widest uppercase font-medium",
      styles[variant],
      pulse && "animate-pulse-red",
      className
    )}>
      {children}
    </span>
  );
}

// ── BUTTON ────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const base = "inline-flex items-center justify-center font-mono-dm tracking-widest uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-reaper-red text-white hover:shadow-[0_0_30px_rgba(217,26,15,0.5)] hover:-translate-y-0.5",
    ghost:   "border border-reaper-border2 text-reaper-muted hover:text-reaper-text hover:border-reaper-dim",
    danger:  "bg-[#1C0000] border border-reaper-red text-reaper-red hover:bg-reaper-red hover:text-white",
  };
  const sizes = {
    sm: "text-[9px] px-3 py-1.5 rounded",
    md: "text-[10px] px-4 py-2.5 rounded",
    lg: "text-[11px] px-6 py-3 rounded",
  };

  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          {children}
        </span>
      ) : children}
    </button>
  );
}

// ── CARD ──────────────────────────────────────
interface CardProps {
  children: React.ReactNode;
  className?: string;
  accent?: "red" | "orange" | "green" | "yellow" | "purple" | "none";
}

export function Card({ children, className, accent = "none" }: CardProps) {
  const accents = {
    red:    "before:bg-reaper-red before:shadow-[0_0_12px_rgba(217,26,15,0.6)]",
    orange: "before:bg-reaper-orange before:shadow-[0_0_12px_rgba(224,112,0,0.6)]",
    green:  "before:bg-reaper-green before:shadow-[0_0_10px_rgba(0,184,90,0.5)]",
    yellow: "before:bg-reaper-gold before:shadow-[0_0_10px_rgba(201,150,10,0.5)]",
    purple: "before:bg-[#9b59ff] before:shadow-[0_0_10px_rgba(155,89,255,0.5)]",
    none:   "",
  };

  return (
    <div className={cn(
      "bg-reaper-bg2 border border-reaper-border rounded-lg relative overflow-hidden",
      accent !== "none" && "before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:content-['']",
      accents[accent],
      className
    )}>
      {children}
    </div>
  );
}

// ── SECTION LABEL ─────────────────────────────
export function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono-dm text-[8.5px] tracking-[3px] text-reaper-red uppercase mb-2 flex items-center gap-2">
      {children}
      <div className="flex-1 h-px bg-reaper-border" />
    </div>
  );
}

// ── STAT ──────────────────────────────────────
interface StatProps {
  value: string | number;
  label: string;
  sub?: string;
  color?: string;
}

export function Stat({ value, label, sub, color = "text-reaper-red" }: StatProps) {
  return (
    <div>
      <div className={cn("font-display text-5xl leading-none", color)}>{value}</div>
      <div className="font-mono-dm text-[9px] tracking-[2px] text-reaper-dim uppercase mt-1">{label}</div>
      {sub && <div className="text-[10px] text-reaper-dim mt-0.5">{sub}</div>}
    </div>
  );
}
