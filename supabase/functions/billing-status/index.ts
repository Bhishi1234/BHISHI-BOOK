import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflight, json } from "../_shared/cashfree.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  try {
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

    const url = new URL(req.url);
    let merchantSubId = url.searchParams.get("sub_id") || "";
    if (req.method === "POST") {
      try {
        const body = await req.json();
        merchantSubId = String(body.sub_id || body.merchantSubscriptionId || merchantSubId);
      } catch {
        /* get only */
      }
    }

    const { data: profile } = await admin
      .from("profiles")
      .select("plan, billing_mode, plan_expires_at")
      .eq("id", userData.user.id)
      .maybeSingle();

    let subscription = null as Record<string, unknown> | null;
    if (merchantSubId) {
      const { data } = await admin
        .from("billing_subscriptions")
        .select("*")
        .eq("user_id", userData.user.id)
        .eq("cashfree_subscription_id", merchantSubId)
        .maybeSingle();
      subscription = data;
    } else {
      const { data } = await admin
        .from("billing_subscriptions")
        .select("*")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      subscription = data;
    }

    const expires = profile?.plan_expires_at ? new Date(String(profile.plan_expires_at)) : null;
    const active =
      (profile?.plan === "pro" || profile?.plan === "power") &&
      (!expires || expires.getTime() > Date.now());

    return json({
      ok: true,
      active,
      plan: profile?.plan || "free",
      billingMode: profile?.billing_mode || "payg",
      planExpiresAt: profile?.plan_expires_at || null,
      subscription,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Status failed" }, 400);
  }
});
