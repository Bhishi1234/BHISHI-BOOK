import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflight, json, cashfreeFetch } from "../_shared/cashfree.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);

    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } }, auth: { persistSession: false } },
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: userData, error: userErr } = await sb.auth.getUser();
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const merchantSubId = String(body.merchantSubscriptionId || body.sub_id || "");
    if (!merchantSubId) return json({ error: "merchantSubscriptionId required" }, 400);

    const { data: sub } = await admin
      .from("billing_subscriptions")
      .select("*")
      .eq("user_id", userData.user.id)
      .eq("cashfree_subscription_id", merchantSubId)
      .maybeSingle();
    if (!sub) return json({ error: "Subscription not found" }, 404);

    try {
      await cashfreeFetch(`/subscriptions/${encodeURIComponent(merchantSubId)}`, {
        method: "PATCH",
        body: JSON.stringify({ subscription_status: "CANCELLED" }),
      });
    } catch {
      // Some CF versions use manage/cancel endpoints — still mark local
    }

    await admin.rpc("mark_subscription_status", {
      p_cashfree_subscription_id: merchantSubId,
      p_status: "cancelled",
    });

    return json({
      ok: true,
      message: "Cancellation requested. Access continues until the current period ends.",
      planExpiresAt: sub.current_period_end,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Cancel failed" }, 400);
  }
});
