"use client";
import { useState } from "react";
import type { Alert } from "@/types";
import { Badge, Button } from "@/components/ui";
import { cn } from "@/components/ui";

interface AlertFeedProps {
  alerts: Alert[];
  onAction?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
}

const SEVERITY_STYLES = {
  critical: {
    bg:     "bg-[#0d0000]",
    border: "border-reaper-red border-l-2",
    badge:  "critical" as const,
  },
  warning: {
    bg:     "bg-[#0d0800]",
    border: "border-l-2",
    badge:  "warning" as const,
    style:  { borderLeftColor: "#E07000", borderColor: "#1e1400" },
  },
  info: {
    bg:     "bg-reaper-bg2",
    border: "border-l-2",
    badge:  "info" as const,
    style:  { borderLeftColor: "#4fc3f7", borderColor: "#1e1e1e" },
  },
};

export function AlertFeed({ alerts, onAction, onDismiss }: AlertFeedProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [actioned, setActioned] = useState<Set<string>>(new Set());

  const active = alerts.filter(
    (a) => !a.dismissed_at && !actioned.has(a.id)
  );

  if (active.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-4xl mb-3">✅</div>
        <div className="font-display text-xl text-reaper-green tracking-wide">ALL CLEAR</div>
        <div className="text-sm text-reaper-dim mt-1">No active alerts. Shop health is stable.</div>
      </div>
    );
  }

  async function handleAction(alertId: string) {
    await fetch("/api/reaper/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, action: "actioned" }),
    });
    setActioned((prev) => new Set([...prev, alertId]));
    onAction?.(alertId);
  }

  async function handleDismiss(alertId: string) {
    await fetch("/api/reaper/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ alertId, action: "dismissed" }),
    });
    setActioned((prev) => new Set([...prev, alertId]));
    onDismiss?.(alertId);
  }

  return (
    <div className="flex flex-col gap-2.5">
      {active.map((alert) => {
        const style = SEVERITY_STYLES[alert.severity];
        const isOpen = expanded === alert.id;

        return (
          <div
            key={alert.id}
            className={cn(
              "rounded-lg border p-4 transition-all duration-200",
              style.bg, style.border
            )}
            style={(style as { style?: React.CSSProperties }).style}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                {/* Header row */}
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Badge variant={style.badge} pulse={alert.severity === "critical"}>
                    {alert.severity}
                  </Badge>
                  <span className="font-mono-dm text-[9px] text-reaper-dim tracking-wider">
                    {new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  {alert.revenue_at_risk && (
                    <span className="font-mono-dm text-[9px] text-reaper-orange tracking-wider">
                      ~${Math.round(alert.revenue_at_risk / 100) * 100} at risk
                    </span>
                  )}
                </div>

                {/* Title */}
                <div className="text-sm font-semibold text-reaper-text mb-1">
                  {alert.title}
                </div>

                {/* Message */}
                <div className="text-xs text-reaper-muted leading-relaxed">
                  {alert.message}
                </div>

                {/* Fix script (expandable) */}
                {isOpen && (
                  <div className="mt-3 bg-reaper-bg3 rounded p-3 border border-reaper-border animate-slide-up">
                    <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-red mb-2">
                      FIX SCRIPT
                    </div>
                    <pre className="text-[11px] text-reaper-muted whitespace-pre-wrap leading-relaxed font-mono-dm">
                      {alert.fix_script}
                    </pre>
                    {alert.policy_ref && (
                      <div className="mt-2 pt-2 border-t border-reaper-border">
                        <div className="font-mono-dm text-[8px] tracking-[2px] text-reaper-dim">
                          📋 {alert.policy_ref}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-1.5 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(isOpen ? null : alert.id)}
                  className="text-[8px]"
                >
                  {isOpen ? "Close" : "Fix Script"}
                </Button>
                <Button
                  size="sm"
                  variant={alert.severity === "critical" ? "primary" : "ghost"}
                  onClick={() => handleAction(alert.id)}
                  className="text-[8px]"
                >
                  Actioned ✓
                </Button>
                <button
                  onClick={() => handleDismiss(alert.id)}
                  className="text-[8px] font-mono-dm text-reaper-dim hover:text-reaper-muted tracking-wider transition-colors"
                >
                  dismiss
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
