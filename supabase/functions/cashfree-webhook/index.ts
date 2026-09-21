import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsPreflight,
  json,
  periodEndFromNow,
  verifyCashfreeWebhook,
  type BillingInterval,
  type BillingPlan,
} from "../_shared/cashfree.ts";

function pickSubId(data: Record<string, unknown>): string {
  const nested = data.subscription as Record<string, unknown> | undefined;
  return String(
    data.subscription_id ||
      data.cf_subscriptionId ||
      nested?.subscription_id ||
      data.subs_id ||
      "",
  );
}

function pickEventId(payload: Record<string, unknown>, type: string, subId: string) {
  return String(
    payload.event_id ||
      payload.eventId ||
      `${type}:${subId}:${payload.event_time || payload.payment_id || Date.now()}`,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const rawBody = await req.text();
    const timestamp = req.headers.get("x-webhook-timestamp");
    const signature = req.headers.get("x-webhook-signature");
    const okSig = await verifyCashfreeWebhook(rawBody, timestamp, signature);
    if (!okSig) return json({ error: "Invalid signature" }, 401);

    const payload = JSON.parse(rawBody) as Record<string, unknown>;
    const type = String(payload.type || payload.event || "");
    const data = (payload.data || payload) as Record<string, unknown>;
    const subId = pickSubId(data);
    const eventId = pickEventId(payload, type, subId);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { error: evErr } = await admin.from("billing_events").insert({
      event_id: eventId,
      event_type: type,
      cashfree_subscription_id: subId || null,
      payload,
    });
    if (evErr) {
      // duplicate event_id → already processed
      if (String(evErr.message || "").toLowerCase().includes("duplicate")) {
        return json({ ok: true, duplicate: true });
      }
      return json({ error: evErr.message }, 500);
    }

    if (!subId) return json({ ok: true, skipped: "no subscription id" });

    const { data: sub } = await admin
      .from("billing_subscriptions")
      .select("*")
      .eq("cashfree_subscription_id", subId)
      .maybeSingle();

    if (!sub) return json({ ok: true, skipped: "unknown subscription" });

    const plan = sub.plan as BillingPlan;
    const interval = sub.interval as BillingInterval;
    const paymentId = String(
      data.payment_id ||
        (data.payment as Record<string, unknown> | undefined)?.payment_id ||
        "",
    );

    if (
      type === "SUBSCRIPTION_PAYMENT_SUCCESS" ||
      type === "SUBSCRIPTION_AUTH_STATUS" ||
      type === "SUBSCRIPTION_STATUS_CHANGED"
    ) {
      const statusRaw = String(
        data.subscription_status ||
          data.cf_status ||
          (data.subscription as Record<string, unknown> | undefined)?.subscription_status ||
          data.authorization_status ||
          "",
      ).toUpperCase();

      const paymentOk =
        type === "SUBSCRIPTION_PAYMENT_SUCCESS" ||
        statusRaw === "ACTIVE" ||
        statusRaw === "BANK_APPROVAL_PENDING" ||
        String((data.payment as Record<string, unknown> | undefined)?.payment_status || "").toUpperCase() ===
          "SUCCESS";

      if (paymentOk || statusRaw === "ACTIVE") {
        const periodEnd = periodEndFromNow(interval).toISOString();
        await admin.rpc("activate_subscription_plan", {
          p_user_id: sub.user_id,
          p_plan: plan,
          p_interval: interval,
          p_cashfree_subscription_id: subId,
          p_period_end: periodEnd,
          p_cf_payment_id: paymentId || null,
        });
      }
    }

    if (type === "SUBSCRIPTION_PAYMENT_FAILED" || type === "SUBSCRIPTION_PAYMENT_CANCELLED") {
      await admin.rpc("mark_subscription_status", {
        p_cashfree_subscription_id: subId,
        p_status: type.includes("CANCEL") ? "cancelled" : "failed",
      });
    }

    if (type === "SUBSCRIPTION_STATUS_CHANGED") {
      const st = String(
        data.subscription_status ||
          (data.subscription as Record<string, unknown> | undefined)?.subscription_status ||
          "",
      ).toUpperCase();
      if (st === "CANCELLED" || st === "CUSTOMER_CANCELLED") {
        await admin.rpc("mark_subscription_status", {
          p_cashfree_subscription_id: subId,
          p_status: "cancelled",
        });
      }
    }

    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Webhook failed" }, 400);
  }
});
