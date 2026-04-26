const CACHE = "shop-reaper-v1";
const STATIC = [
  "/",
  "/dashboard",
  "/dashboard/alerts",
  "/dashboard/products",
  "/dashboard/coach",
  "/manifest.json",
];

// ── INSTALL ──────────────────────────────────
self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(STATIC))
  );
  self.skipWaiting();
});

// ── ACTIVATE ─────────────────────────────────
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── FETCH: Network-first, fallback to cache ──
self.addEventListener("fetch", (e) => {
  // Skip non-GET, API calls, and external requests
  if (
    e.request.method !== "GET" ||
    e.request.url.includes("/api/") ||
    !e.request.url.startsWith(self.location.origin)
  ) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        // Cache successful page responses
        if (res.ok && e.request.mode === "navigate") {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || caches.match("/dashboard")))
  );
});

// ── PUSH NOTIFICATIONS ───────────────────────
self.addEventListener("push", (e) => {
  if (!e.data) return;

  let payload;
  try { payload = e.data.json(); }
  catch { payload = { title: "Shop Reaper", body: e.data.text(), severity: "info" }; }

  const icons = {
    critical: "/icons/icon-192.png",
    warning:  "/icons/icon-192.png",
    info:     "/icons/icon-192.png",
  };

  const colors = {
    critical: "#D91A0F",
    warning:  "#E07000",
    info:     "#00B85A",
  };

  e.waitUntil(
    self.registration.showNotification(payload.title || "💀 Shop Reaper", {
      body:   payload.body,
      icon:   icons[payload.severity] || icons.info,
      badge:  "/icons/icon-72.png",
      tag:    payload.alert_type || "reaper-alert",
      renotify: true,
      vibrate: payload.severity === "critical" ? [200, 100, 200, 100, 400] : [200],
      data: {
        url:        payload.url || "/dashboard/alerts",
        alert_id:   payload.alert_id,
        shop_id:    payload.shop_id,
        severity:   payload.severity,
      },
      actions: [
        { action: "view",    title: "View Fix Script" },
        { action: "dismiss", title: "Dismiss" },
      ],
    })
  );
});

// ── NOTIFICATION CLICK ────────────────────────
self.addEventListener("notificationclick", (e) => {
  e.notification.close();

  if (e.action === "dismiss") return;

  const url = e.notification.data?.url || "/dashboard/alerts";

  e.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Focus existing window if open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});

// ── BACKGROUND SYNC ───────────────────────────
self.addEventListener("sync", (e) => {
  if (e.tag === "sync-metrics") {
    e.waitUntil(syncMetrics());
  }
  if (e.tag === "mark-alert-actioned") {
    e.waitUntil(flushPendingActions());
  }
});

async function syncMetrics() {
  try {
    await fetch("/api/reaper/sync", { method: "POST", body: JSON.stringify({ background: true }) });
  } catch (err) {
    console.error("Background sync failed:", err);
  }
}

async function flushPendingActions() {
  // Read from IndexedDB and replay any queued alert actions
  // that failed while offline
  const db = await openDB();
  const tx = db.transaction("pending_actions", "readwrite");
  const store = tx.objectStore("pending_actions");
  const actions = await store.getAll();

  for (const action of actions) {
    try {
      await fetch("/api/reaper/alerts", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(action),
      });
      await store.delete(action.id);
    } catch {}
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open("shop-reaper", 1);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("pending_actions")) {
        db.createObjectStore("pending_actions", { keyPath: "id", autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
