import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCodeForToken, TikTokShopClient } from "@/lib/tiktok/client";
import { triggerShopSync } from "@/lib/inngest/jobs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { searchParams } = request.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(new URL(`/dashboard/connect?error=${error}`, request.url));
  }

  // Validate CSRF state
  const storedState = request.cookies.get("tiktok_oauth_state")?.value;
  if (!state || state !== storedState) {
    return NextResponse.redirect(new URL("/dashboard/connect?error=invalid_state", request.url));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/dashboard/connect?error=no_code", request.url));
  }

  try {
    // Exchange code for tokens
    const tokenData = await exchangeCodeForToken(code);

    // Get shop details
    const client = new TikTokShopClient(tokenData.access_token, tokenData.seller_id);
    const shopInfo = await client.getShopInfo().catch(() => ({
      shop_id: tokenData.seller_id,
      shop_name: tokenData.seller_name,
      region: "US",
      shop_status: "ACTIVE",
    }));

    // Check if shop already connected
    const { data: existingShop } = await supabase
      .from("shops")
      .select("id")
      .eq("tiktok_shop_id", tokenData.seller_id)
      .single();

    if (existingShop) {
      // Update tokens for reconnect
      await supabase.from("shops").update({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        is_active: true,
        last_synced_at: null,
      }).eq("id", existingShop.id);

      await triggerShopSync(existingShop.id);
      return NextResponse.redirect(new URL("/dashboard?reconnected=true", request.url));
    }

    // Create new shop record
    const { data: newShop, error: shopError } = await supabase
      .from("shops")
      .insert({
        user_id: user.id,
        tiktok_shop_id: tokenData.seller_id,
        tiktok_handle: `@${shopInfo.shop_name.toLowerCase().replace(/\s+/g, "_")}`,
        shop_name: shopInfo.shop_name,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        token_expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
        region: shopInfo.region ?? "US",
        is_active: true,
      })
      .select()
      .single();

    if (shopError || !newShop) throw new Error("Failed to create shop record");

    // Fire first sync immediately
    await triggerShopSync(newShop.id);

    const response = NextResponse.redirect(new URL("/dashboard?connected=true", request.url));
    response.cookies.delete("tiktok_oauth_state");
    return response;

  } catch (err) {
    console.error("TikTok callback error:", err);
    return NextResponse.redirect(
      new URL(`/dashboard/connect?error=exchange_failed`, request.url)
    );
  }
}
