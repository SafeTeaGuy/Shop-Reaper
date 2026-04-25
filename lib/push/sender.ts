import webpush from "web-push";
import type { Alert } from "@/types";

webpush.setVapidDetails(
  "mailto:alerts@shopreaper.io",
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushSubscription {
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushAlert(
  subscriptions: PushSubscription[],
  alert: Alert
) {
  const payload = JSON.stringify({
    title:      `💀 ${alert.title}`,
    body:       alert.message.slice(0, 120) + (alert.message.length > 120 ? "…" : ""),
    severity:   alert.severity,
    alert_type: alert.alert_type,
    alert_id:   alert.id,
    shop_id:    alert.shop_id,
    url:        "/dashboard/alerts",
  });

  const results = await Promise.allSettled(
    subscriptions.map((sub) =>
      webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload,
        {
          urgency: alert.severity === "critical" ? "high" : "normal",
          TTL: alert.severity === "critical" ? 3600 : 86400,
        }
      )
    )
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  if (failed > 0) console.error(`[Reaper Push] ${failed} notifications failed`);

  return { sent: results.length - failed, failed };
}
