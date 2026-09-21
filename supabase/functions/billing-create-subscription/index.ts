import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsPreflight,
  json,
  PLAN_AMOUNTS,
  periodEndFromNow,
  resolveCashfreePlanId,
  siteUrl,
  cashfreeFetch,
  type BillingInterval,
  type BillingPlan,
} from "../_shared/cashfree.ts";

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
    const user = userData.user;

    const body = await req.json();
    const plan = String(body.plan || "") as BillingPlan;
    const interval = String(body.interval || "") as BillingInterval;
    if (plan !== "pro" && plan !== "power") return json({ error: "Invalid plan" }, 400);
    if (interval !== "month" && interval !== "year") return json({ error: "Invalid interval" }, 400);

    const amount = PLAN_AMOUNTS[plan][interval];
    const cfPlanId = resolveCashfreePlanId(plan, interval);

    const { data: profile } = await admin
      .from("profiles")
      .select("id, name, email, phone")
      .eq("id", user.id)
      .maybeSingle();

    const phone = String(profile?.phone || "").replace(/\D/g, "").slice(-10) || "9999999999";
    const email = String(profile?.email || user.email || `${user.id}@bhishibook.local`);
    const name = String(profile?.name || "Bhishi Circle user");

    const merchantSubId = `bb_${user.id.replace(/-/g, "").slice(0, 12)}_${Date.now()}`;
    const returnUrl = `${siteUrl()}/billing/success?sub_id=${encodeURIComponent(merchantSubId)}`;

    const { data: row, error: insErr } = await admin
      .from("billing_subscriptions")
      .insert({
        user_id: user.id,
        plan,
        interval,
        amount_inr: amount,
        status: "pending",
        cashfree_plan_id: cfPlanId,
        cashfree_subscription_id: merchantSubId,
        current_period_end: periodEndFromNow(interval).toISOString(),
      })
      .select("*")
      .single();
    if (insErr) return json({ error: insErr.message }, 500);

    const cfBody = {
      subscription_id: merchantSubId,
      customer_details: {
        customer_name: name,
        customer_email: email,
        customer_phone: phone,
      },
      plan_details: {
        plan_id: cfPlanId,
      },
      authorization_details: {
        authorization_amount: Math.min(amount, 1) || 1,
        authorization_amount_refund: true,
        payment_methods: ["upi", "card", "enach"],
      },
      subscription_meta: {
        return_url: returnUrl,
        notification_channel: ["EMAIL"],
      },
      subscription_tags: {
        bhishi_plan: plan,
        bhishi_interval: interval,
        bhishi_user: user.id,
      },
    };

    let cf: Record<string, unknown>;
    try {
      cf = await cashfreeFetch("/subscriptions", {
        method: "POST",
        body: JSON.stringify(cfBody),
      });
    } catch (e) {
      await admin
        .from("billing_subscriptions")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", row.id);
      return json({ error: e instanceof Error ? e.message : "Cashfree create failed" }, 502);
    }

    const sessionId = String(cf.subscription_session_id || "");
    await admin
      .from("billing_subscriptions")
      .update({
        cashfree_session_id: sessionId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    const env = (Deno.env.get("CASHFREE_ENV") || "sandbox").toLowerCase();
    return json({
      ok: true,
      subscriptionId: row.id,
      merchantSubscriptionId: merchantSubId,
      subscriptionSessionId: sessionId,
      cashfreeEnv: env === "production" ? "production" : "sandbox",
      amount,
      plan,
      interval,
      returnUrl,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed to start subscription" }, 400);
  }
});
