import { Inngest } from "inngest";
import { createAdminClient } from "@/lib/supabase/server";
import { TikTokShopClient, computeSps, refreshAccessToken } from "@/lib/tiktok/client";
import { generateAlerts } from "@/lib/reaper/alerts";
import type { Shop, ShopMetrics, SpsComponents, Alert } from "@/types";
import twilio from "twilio";

export const inngest = new Inngest({ id: "shop-reaper" });

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// ─────────────────────────────────────────────
// JOB: Poll all connected shops every 6 hours
// ─────────────────────────────────────────────
export const pollAllShops = inngest.createFunction(
  { id: "poll-all-shops", name: "Poll All Shops" },
  { cron: "0 */6 * * *" },
  async ({ step }) => {
    const supabase = await createAdminClient();

    const { data: shops } = await supabase
      .from("shops")
      .select("*")
      .eq("is_active", true);

    if (!shops?.length) return { polled: 0 };

    await Promise.allSettled(
      shops.map((shop: Shop) =>
        step.invoke(`sync-shop-${shop.id}`, {
          function: syncShop,
          data: { shopId: shop.id },
        })
      )
    );

    return { polled: shops.length };
  }
);

// ─────────────────────────────────────────────
// JOB: Sync a single shop
// ─────────────────────────────────────────────
export const syncShop = inngest.createFunction(
  { id: "sync-shop", name: "Sync Shop Metrics" },
  { event: "shop/sync.requested" },
  async ({ event, step }) => {
    const { shopId } = event.data as { shopId: string };
    const supabase = await createAdminClient();

    // Fetch shop
    const { data: shop } = await supabase
      .from("shops")
      .select("*")
      .eq("id", shopId)
      .single();

    if (!shop) throw new Error(`Shop ${shopId} not found`);

    // Refresh token if expiring within 1 hour
    const tokenExpiresAt = new Date(shop.token_expires_at).getTime();
    let accessToken = shop.access_token;

    if (tokenExpiresAt - Date.now() < 3600 * 1000) {
      const refreshed = await step.run("refresh-token", async () => {
        return refreshAccessToken(shop.refresh_token);
      });
      accessToken = refreshed.access_token;
      await supabase.from("shops").update({
        access_token: refreshed.access_token,
        refresh_token: refreshed.refresh_token,
        token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
      }).eq("id", shopId);
    }

    // Pull metrics from TikTok
    const metrics = await step.run("fetch-tiktok-metrics", async () => {
      const client = new TikTokShopClient(accessToken, shop.tiktok_shop_id);
      const now = new Date();
      const d30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const startDate = d30.toISOString().split("T")[0];
      const endDate = now.toISOString().split("T")[0];

      const [performance, returns, violations, orders] = await Promise.all([
        client.getShopPerformance(startDate, endDate).catch(() => null),
        client.getReturns(100).catch(() => ({ returns: [], total_count: 0 })),
        client.getViolations().catch(() => ({ violations: [], total_count: 0 })),
        client.getOrders(100).catch(() => ({ orders: [], total_count: 0 })),
      ]);

      const nonBuyerFaultReturns = returns.returns.filter(
        (r: { fault_type: string }) => r.fault_type === "SELLER_FAULT"
      ).length;
      const totalReturns = returns.returns.length || 1;
      const totalOrders = orders.total_count || 1;

      const components: SpsComponents = {
        negative_review_rate:        performance?.negative_review_rate ?? 3,
        return_rate_non_buyer_fault: (nonBuyerFaultReturns / totalReturns) * 100,
        cancel_rate_seller_fault:    performance?.seller_fault_cancel_rate ?? 2,
        on_time_delivery_rate:       performance?.on_time_delivery_rate ?? 70,
        im_dissatisfaction_rate:     (100 - (performance?.im_satisfaction_rate ?? 85)),
        aftersales_handling_hours:   36,
      };

      const sps = computeSps(components);
      const refundRate = (returns.returns.length / totalOrders) * 100;

      return {
        components,
        sps,
        violations_count: violations.total_count,
        orders_total: orders.total_count,
        refund_rate: refundRate,
        pending_orders: orders.orders.filter(
          (o: { status: string }) => o.status === "AWAITING_SHIPMENT"
        ).length,
      };
    });

    // Save metrics to DB
    const metricsRow = await step.run("save-metrics", async () => {
      const { components, sps, violations_count, orders_total, refund_rate, pending_orders } = metrics;
      const row: Partial<ShopMetrics> = {
        shop_id: shopId,
        date: new Date().toISOString().split("T")[0],
        negative_review_rate:        components.negative_review_rate,
        return_rate_non_buyer_fault: components.return_rate_non_buyer_fault,
        cancel_rate_seller_fault:    components.cancel_rate_seller_fault,
        on_time_delivery_rate:       components.on_time_delivery_rate,
        im_dissatisfaction_rate:     components.im_dissatisfaction_rate,
        aftersales_handling_hours:   components.aftersales_handling_hours,
        sps_computed:                sps.score,
        ahr:                         Math.round(sps.score * 20),
        risk_level:                  sps.risk,
        violations_count,
        revenue_30d:                 0, // populated from finance endpoint separately
        orders_30d:                  orders_total,
        pending_orders,
        refund_rate,
        affiliate_count:             0,
        raw_json:                    { components, sps },
      };
      const { data } = await supabase.from("metrics").upsert(row, {
        onConflict: "shop_id,date",
      }).select().single();
      return data;
    });

    // Generate and fire alerts
    await step.run("generate-alerts", async () => {
      const { data: existingAlerts } = await supabase
        .from("alerts_log")
        .select("*")
        .eq("shop_id", shopId)
        .order("created_at", { ascending: false })
        .limit(50);

      const newAlerts = generateAlerts(
        shopId,
        metricsRow as ShopMetrics,
        metrics.sps,
        (existingAlerts ?? []) as Alert[]
      );

      if (newAlerts.length > 0) {
        await supabase.from("alerts_log").insert(newAlerts);

        // Send SMS for critical alerts on Reaper+ plans
        const criticalAlerts = newAlerts.filter((a) => a.severity === "critical");
        if (criticalAlerts.length > 0) {
          const { data: shopUser } = await supabase
            .from("shops")
            .select("user_id")
            .eq("id", shopId)
            .single();

          if (shopUser) {
            const { data: user } = await supabase
              .from("users")
              .select("sms_phone, sms_enabled, plan_tier")
              .eq("id", shopUser.user_id)
              .single();

            if (user?.sms_enabled && user.sms_phone && user.plan_tier !== "basic") {
              for (const alert of criticalAlerts.slice(0, 1)) {
                await twilioClient.messages.create({
                  body: `💀 SHOP REAPER: ${alert.title}\n\n${alert.message.slice(0, 160)}\n\nLog in to get the fix script.`,
                  from: process.env.TWILIO_PHONE_NUMBER!,
                  to: user.sms_phone,
                });
                await supabase.from("alerts_log").update({ sent_sms: true })
                  .eq("shop_id", shopId)
                  .eq("alert_type", alert.alert_type);
              }
            }
          }
        }
      }
    });

    // Update last_synced_at
    await supabase.from("shops").update({
      last_synced_at: new Date().toISOString(),
    }).eq("id", shopId);

    return { shopId, sps: metrics.sps.score, risk: metrics.sps.risk };
  }
);

// ─────────────────────────────────────────────
// EVENT: Trigger manual sync
// ─────────────────────────────────────────────
export async function triggerShopSync(shopId: string) {
  await inngest.send({ name: "shop/sync.requested", data: { shopId } });
}
