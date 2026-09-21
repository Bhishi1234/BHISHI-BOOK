import { getSupabase, isSupabaseConfigured } from "./supabase";
import type { PlanId } from "../types";

export type BillingInterval = "month" | "year";
export type PaidPlan = Exclude<PlanId, "free">;

export type CreateSubscriptionResult = {
  ok: true;
  subscriptionId: string;
  merchantSubscriptionId: string;
  subscriptionSessionId: string;
  cashfreeEnv: "sandbox" | "production";
  amount: number;
  plan: PaidPlan;
  interval: BillingInterval;
  returnUrl: string;
};

export type BillingStatusResult = {
  ok: true;
  active: boolean;
  plan: PlanId;
  billingMode: string;
  planExpiresAt: string | null;
  subscription: Record<string, unknown> | null;
};

async function authHeader() {
  const sb = getSupabase();
  const { data } = await sb.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sign in to upgrade");
  return { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY || "" };
}

function functionsBase() {
  const url = import.meta.env.VITE_SUPABASE_URL || "";
  if (!url) throw new Error("Supabase is not configured");
  return `${url.replace(/\/$/, "")}/functions/v1`;
}

export async function createBillingSubscription(
  plan: PaidPlan,
  interval: BillingInterval,
): Promise<CreateSubscriptionResult> {
  if (!isSupabaseConfigured()) throw new Error("Billing requires Supabase");
  const headers = await authHeader();
  const res = await fetch(`${functionsBase()}/billing-create-subscription`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ plan, interval }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not start checkout");
  return body as CreateSubscriptionResult;
}

export async function fetchBillingStatus(merchantSubscriptionId?: string): Promise<BillingStatusResult> {
  if (!isSupabaseConfigured()) throw new Error("Billing requires Supabase");
  const headers = await authHeader();
  const q = merchantSubscriptionId
    ? `?sub_id=${encodeURIComponent(merchantSubscriptionId)}`
    : "";
  const res = await fetch(`${functionsBase()}/billing-status${q}`, {
    method: "GET",
    headers,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not load billing status");
  return body as BillingStatusResult;
}

export async function cancelBillingSubscription(merchantSubscriptionId: string) {
  if (!isSupabaseConfigured()) throw new Error("Billing requires Supabase");
  const headers = await authHeader();
  const res = await fetch(`${functionsBase()}/billing-cancel`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ merchantSubscriptionId }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.error || "Could not cancel");
  return body;
}

type CashfreeSdk = {
  subscriptionsCheckout: (opts: { subsSessionId: string; redirectTarget?: string }) => Promise<unknown>;
};

declare global {
  interface Window {
    Cashfree?: (opts: { mode: string }) => CashfreeSdk;
  }
}

function loadCashfreeScript(): Promise<void> {
  if (window.Cashfree) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Cashfree SDK"));
    document.head.appendChild(s);
  });
}

/** Open Cashfree hosted subscription auth checkout. */
export async function openSubscriptionCheckout(
  sessionId: string,
  mode: "sandbox" | "production",
) {
  if (!sessionId) throw new Error("Missing subscription session id from Cashfree");
  await loadCashfreeScript();
  if (!window.Cashfree) throw new Error("Cashfree SDK unavailable");
  const cashfree = window.Cashfree({ mode });
  await cashfree.subscriptionsCheckout({
    subsSessionId: sessionId,
    redirectTarget: "_self",
  });
}
