"use client";
import { useEffect, useState, createContext, useContext } from "react";

interface PWAContextType {
  canInstall: boolean;
  isInstalled: boolean;
  notificationsGranted: boolean;
  install: () => Promise<void>;
  requestNotifications: () => Promise<void>;
}

const PWAContext = createContext<PWAContextType>({
  canInstall: false,
  isInstalled: false,
  notificationsGranted: false,
  install: async () => {},
  requestNotifications: async () => {},
});

export function usePWA() { return useContext(PWAContext); }

let deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [canInstall, setCanInstall]                   = useState(false);
  const [isInstalled, setIsInstalled]                 = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(false);

  useEffect(() => {
    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[Reaper SW] registered", reg.scope);
          // Schedule background sync every 6 hours
          if ("periodicSync" in reg) {
            (reg as unknown as { periodicSync: { register: (tag: string, opts: object) => Promise<void> } })
              .periodicSync.register("sync-metrics", { minInterval: 6 * 60 * 60 * 1000 })
              .catch(() => {});
          }
        })
        .catch((err) => console.error("[Reaper SW] failed", err));
    }

    // Install prompt
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    });

    // Already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setCanInstall(false);
      deferredPrompt = null;
    });

    // Check notification permission
    if ("Notification" in window) {
      setNotificationsGranted(Notification.permission === "granted");
    }
  }, []);

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsInstalled(true);
      setCanInstall(false);
    }
    deferredPrompt = null;
  }

  async function requestNotifications() {
    if (!("Notification" in window)) return;
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return;
    setNotificationsGranted(true);

    // Subscribe to push
    const reg = await navigator.serviceWorker.ready;
    try {
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });
      // Send subscription to server
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub),
      });
    } catch (err) {
      console.error("[Reaper] Push subscription failed:", err);
    }
  }

  return (
    <PWAContext.Provider value={{ canInstall, isInstalled, notificationsGranted, install, requestNotifications }}>
      {children}
    </PWAContext.Provider>
  );
}
