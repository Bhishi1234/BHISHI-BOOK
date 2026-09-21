import { corsPreflight, json } from "./otp.ts";

export { corsPreflight, json };

export type BillingPlan = "pro" | "power";
export type BillingInterval = "month" | "year";

export const PLAN_AMOUNTS: Record<BillingPlan, Record<BillingInterval, number>> = {
  pro: { month: 199, year: 1999 },
  power: { month: 499, year: 4999 },
};

export function cashfreeBaseUrl() {
  const env = (Deno.env.get("CASHFREE_ENV") || "sandbox").toLowerCase();
  return env === "production"
    ? "https://api.cashfree.com/pg"
    : "https://sandbox.cashfree.com/pg";
}

export function cashfreeHeaders(extra: Record<string, string> = {}) {
  const id = Deno.env.get("CASHFREE_APP_ID");
  const secret = Deno.env.get("CASHFREE_SECRET_KEY");
  if (!id || !secret) throw new Error("Cashfree keys are not configured on the server");
  return {
    accept: "application/json",
    "content-type": "application/json",
    "x-api-version": "2025-01-01",
    "x-client-id": id,
    "x-client-secret": secret,
    ...extra,
  };
}

export function resolveCashfreePlanId(plan: BillingPlan, interval: BillingInterval) {
  const key =
    plan === "pro"
      ? interval === "month"
        ? "CASHFREE_PLAN_PRO_MONTH"
        : "CASHFREE_PLAN_PRO_YEAR"
      : interval === "month"
        ? "CASHFREE_PLAN_POWER_MONTH"
        : "CASHFREE_PLAN_POWER_YEAR";
  const id = Deno.env.get(key);
  if (!id) throw new Error(`Missing server secret ${key} — create the Cashfree plan and set it`);
  return id;
}

export function siteUrl() {
  return (
    Deno.env.get("SITE_URL") ||
    Deno.env.get("VITE_APP_URL") ||
    "http://localhost:5173"
  ).replace(/\/$/, "");
}

export function periodEndFromNow(interval: BillingInterval) {
  const d = new Date();
  if (interval === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d;
}

export async function cashfreeFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${cashfreeBaseUrl()}${path}`, {
    ...init,
    headers: {
      ...cashfreeHeaders(),
      ...(init.headers as Record<string, string> | undefined),
    },
  });
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }
  if (!res.ok) {
    const msg =
      typeof body === "object" && body && "message" in body
        ? String((body as { message: unknown }).message)
        : text || res.statusText;
    throw new Error(`Cashfree ${res.status}: ${msg}`);
  }
  return body as Record<string, unknown>;
}

/** Verify Cashfree subscription webhook signature (HMAC-SHA256, Base64). */
export async function verifyCashfreeWebhook(
  rawBody: string,
  timestamp: string | null,
  signature: string | null,
) {
  if (!timestamp || !signature) return false;
  const secret =
    Deno.env.get("CASHFREE_WEBHOOK_SECRET") || Deno.env.get("CASHFREE_SECRET_KEY") || "";
  if (!secret) return false;
  const data = new TextEncoder().encode(`${timestamp}${rawBody}`);
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, data);
  const computed = btoa(String.fromCharCode(...new Uint8Array(sig)));
  return computed === signature;
}

export function adminClient() {
  // lazy import style — callers pass createClient
  return {
    url: Deno.env.get("SUPABASE_URL")!,
    key: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  };
}
