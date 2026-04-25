import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { computeSps } from "@/lib/tiktok/client";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const { searchParams } = request.nextUrl;
  const size  = searchParams.get("size")  ?? "lg"; // lg | md | sm
  const theme = searchParams.get("theme") ?? "dark";

  const supabase = await createAdminClient();

  const { data: shop } = await supabase
    .from("shops")
    .select("id, shop_name, tiktok_handle")
    .or(`tiktok_handle.eq.@${handle},tiktok_handle.eq.${handle}`)
    .eq("is_active", true)
    .single();

  // Default fallback badge if shop not found
  if (!shop) {
    return new Response(unverifiedBadge(handle, size, theme), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
    });
  }

  const { data: metrics } = await supabase
    .from("metrics")
    .select("*")
    .eq("shop_id", shop.id)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!metrics) {
    return new Response(unverifiedBadge(handle, size, theme), {
      headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-cache" },
    });
  }

  const sps = computeSps({
    negative_review_rate:        metrics.negative_review_rate,
    return_rate_non_buyer_fault: metrics.return_rate_non_buyer_fault,
    cancel_rate_seller_fault:    metrics.cancel_rate_seller_fault,
    on_time_delivery_rate:       metrics.on_time_delivery_rate,
    im_dissatisfaction_rate:     metrics.im_dissatisfaction_rate,
    aftersales_handling_hours:   metrics.aftersales_handling_hours,
  });

  const isVerified = sps.score >= 3.0 && metrics.violations_count < 3;
  const svg = generateBadgeSvg(shop.shop_name, sps.score, isVerified, size, theme);

  return new Response(svg, {
    headers: {
      "Content-Type":  "image/svg+xml",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
      "X-Score":       String(sps.score),
      "X-Verified":    String(isVerified),
    },
  });
}

function generateBadgeSvg(
  shopName: string,
  score: number,
  verified: boolean,
  size: string,
  theme: string
): string {
  const scoreColor = score >= 3.5 ? "#00B85A" : score >= 3.0 ? "#E07000" : "#D91A0F";
  const bgColor    = theme === "light" ? "#FFFFFF" : "#0A0000";
  const borderCol  = verified ? scoreColor : "#444444";
  const textMain   = theme === "light" ? "#1A1A1A" : "#F0F0F0";
  const textDim    = theme === "light" ? "#777777" : "#555555";
  const brandColor = "#D91A0F";

  if (size === "sm") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="28" viewBox="0 0 160 28">
  <rect width="160" height="28" rx="14" fill="${bgColor}" stroke="${borderCol}" stroke-width="1"/>
  <text x="12" y="18" font-family="monospace" font-size="13" fill="${brandColor}">💀</text>
  <text x="30" y="11" font-family="monospace" font-size="6" fill="${textDim}" letter-spacing="1">REAPER SCORE</text>
  <text x="30" y="21" font-family="Georgia,serif" font-size="11" fill="${scoreColor}" font-weight="bold">${score.toFixed(1)}</text>
  <text x="62" y="21" font-family="monospace" font-size="7" fill="${textDim}">/5</text>
  <circle cx="148" cy="14" r="4" fill="${verified ? scoreColor : "#444"}"/>
</svg>`;
  }

  if (size === "md") {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="44" viewBox="0 0 180 44">
  <rect width="180" height="44" rx="8" fill="${bgColor}" stroke="${borderCol}" stroke-width="1"/>
  <text x="10" y="28" font-family="monospace" font-size="20" fill="${brandColor}">💀</text>
  <text x="38" y="16" font-family="monospace" font-size="7" fill="${textDim}" letter-spacing="2">SHOP REAPER</text>
  <text x="38" y="33" font-family="Georgia,serif" font-size="18" fill="${scoreColor}" font-weight="bold">${score.toFixed(1)}</text>
  <text x="72" y="33" font-family="monospace" font-size="9" fill="${textDim}">/5</text>
  <text x="142" y="19" font-family="monospace" font-size="7" fill="${verified ? scoreColor : "#666"}" text-anchor="middle">${verified ? "✓" : "✗"}</text>
  <text x="142" y="31" font-family="monospace" font-size="6" fill="${textDim}" text-anchor="middle">${verified ? "VERIFIED" : "PENDING"}</text>
</svg>`;
  }

  // Large (default)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="64" viewBox="0 0 260 64">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bgColor}"/>
      <stop offset="100%" stop-color="${theme === "light" ? "#F8F8F8" : "#060606"}"/>
    </linearGradient>
  </defs>
  <rect width="260" height="64" rx="10" fill="url(#bg)" stroke="${borderCol}" stroke-width="1"/>
  <rect width="2" height="64" rx="1" fill="${scoreColor}"/>

  <!-- Skull -->
  <text x="16" y="40" font-family="monospace" font-size="28" fill="${brandColor}">💀</text>

  <!-- Brand -->
  <text x="54" y="22" font-family="Courier New,monospace" font-size="8" fill="${textDim}" letter-spacing="2">SHOP REAPER</text>

  <!-- Score -->
  <text x="54" y="46" font-family="Georgia,Times New Roman,serif" font-size="26" fill="${scoreColor}" font-weight="bold">${score.toFixed(1)}</text>
  <text x="98" y="46" font-family="Courier New,monospace" font-size="10" fill="${textDim}"> / 5.0</text>

  <!-- Divider -->
  <line x1="148" y1="12" x2="148" y2="52" stroke="${borderCol}" stroke-width="1"/>

  <!-- Verified status -->
  <circle cx="174" cy="28" r="5" fill="${verified ? scoreColor : "#333"}" opacity="0.9"/>
  <text x="174" y="43" font-family="Courier New,monospace" font-size="7" fill="${verified ? scoreColor : "#555"}" text-anchor="middle" letter-spacing="1">${verified ? "VERIFIED" : "PENDING"}</text>

  <!-- Date -->
  <text x="204" y="28" font-family="Courier New,monospace" font-size="7" fill="${textDim}" text-anchor="middle">TODAY</text>
  <text x="204" y="43" font-family="Courier New,monospace" font-size="7" fill="${textDim}" text-anchor="middle">shopreaper</text>
</svg>`;
}

function unverifiedBadge(handle: string, size: string, theme: string): string {
  return generateBadgeSvg(handle, 0, false, size, theme);
}
