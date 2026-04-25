"use client";
import { useState, useEffect } from "react";
import { usePWA } from "@/components/PWAProvider";
import { cn } from "@/components/ui";

export function PWAInstallBanner() {
  const { canInstall, isInstalled, notificationsGranted, install, requestNotifications } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem("pwa-banner-dismissed");
    if (d) setDismissed(true);
  }, []);

  useEffect(() => {
    if (isInstalled && !notificationsGranted) {
      const timer = setTimeout(() => setShowNotifPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled, notificationsGranted]);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("pwa-banner-dismissed", "1");
  }

  async function handleInstall() {
    setInstalling(true);
    await install();
    setInstalling(false);
  }

  // Install banner
  if (canInstall && !isInstalled && !dismissed) {
    return (
      <div className={cn(
        "fixed bottom-20 left-4 right-4 z-50",
        "bg-[#0d0000] border border-reaper-red rounded-xl p-4",
        "shadow-[0_0_40px_rgba(217,26,15,0.2)]",
        "animate-slide-up"
      )}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-reaper-red rounded-lg flex items-center justify-center text-xl flex-shrink-0">💀</div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-lg tracking-wider text-reaper-text mb-0.5">Add to Home Screen</div>
            <div className="text-xs text-reaper-muted leading-relaxed">
              Get critical alerts even when the app is closed. Instant access from your home screen.
            </div>
          </div>
          <button onClick={dismiss} className="text-reaper-dim text-xl leading-none flex-shrink-0">×</button>
        </div>
        <div className="flex gap-2 mt-3">
          <button
            onClick={handleInstall}
            disabled={installing}
            className="flex-1 bg-reaper-red text-white font-mono-dm text-[10px] tracking-[1.5px] py-2.5 rounded-lg transition-all hover:shadow-[0_0_16px_rgba(217,26,15,0.4)] disabled:opacity-60"
          >
            {installing ? "Installing…" : "INSTALL APP"}
          </button>
          <button onClick={dismiss} className="font-mono-dm text-[10px] tracking-wider text-reaper-dim border border-reaper-border px-4 py-2.5 rounded-lg hover:border-reaper-border2 transition-all">
            Later
          </button>
        </div>
      </div>
    );
  }

  // Notifications prompt (after install)
  if (showNotifPrompt && !notificationsGranted && !dismissed) {
    return (
      <div className={cn(
        "fixed bottom-20 left-4 right-4 z-50",
        "bg-reaper-bg2 border border-reaper-border2 rounded-xl p-4",
        "shadow-[0_4px_30px_rgba(0,0,0,0.5)]",
        "animate-slide-up"
      )}>
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">🔔</div>
          <div>
            <div className="font-display text-lg tracking-wider text-reaper-text mb-0.5">Enable Alerts</div>
            <div className="text-xs text-reaper-muted leading-relaxed">
              Get push notifications the second your SPS drops or a threshold is breached. Critical alerts can&apos;t wait.
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { requestNotifications(); setShowNotifPrompt(false); }}
            className="flex-1 bg-reaper-red text-white font-mono-dm text-[10px] tracking-[1.5px] py-2.5 rounded-lg transition-all"
          >
            ENABLE ALERTS
          </button>
          <button
            onClick={() => { setShowNotifPrompt(false); dismiss(); }}
            className="font-mono-dm text-[10px] text-reaper-dim border border-reaper-border px-4 py-2.5 rounded-lg"
          >
            Skip
          </button>
        </div>
      </div>
    );
  }

  return null;
}
