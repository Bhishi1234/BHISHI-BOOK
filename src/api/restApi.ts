import type { AuctionRecord, Chit, PaymentKind, PayMode, PlanId, User } from "../types";
import { normalizeEmail } from "../lib/email";
import { readJson } from "./errors";
import { chitPayload, mapAuction, mapChit, mapCustomer, mapTicket, mapUser } from "./map";
import { META_FREQUENCIES, META_TYPES } from "./contract";

const TOKEN_KEY = "bhishi-book-rest-session";

type SessionBits = { access_token: string; refresh_token: string };

function baseUrl() {
  return (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
}

function readSession(): SessionBits | null {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as SessionBits) : null;
  } catch {
    return null;
  }
}

function writeSession(session: SessionBits | null) {
  if (!session) sessionStorage.removeItem(TOKEN_KEY);
  else sessionStorage.setItem(TOKEN_KEY, JSON.stringify(session));
}

async function request(path: string, init: RequestInit = {}) {
  const session = readSession();
  const res = await fetch(`${baseUrl()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init.headers || {}),
    },
  });
  return readJson(res);
}

export const restApi = {
  authHint() {
    return "Open the verification link in your inbox to finish signing in.";
  },

  onAuthChange(_cb: () => void) {
    return () => undefined;
  },

  async sendOtp(email: string) {
    const data = await request("/api/v1/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({
        email: normalizeEmail(email),
        redirectTo: typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
      }),
    });
    return { ok: true as const, provider: String(data.provider || "API"), devOtp: data.devOtp as string | undefined };
  },

  async verifyOtp(email: string, otp?: string) {
    const data = await request("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({ email: normalizeEmail(email), otp }),
    });
    if (!data.session?.access_token) throw new Error("Could not start session");
    writeSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    return { ok: true };
  },

  async logout() {
    try {
      await request("/api/v1/auth/logout", { method: "POST" });
    } finally {
      writeSession(null);
    }
    return { ok: true };
  },

  async profile() {
    return mapUser(await request("/api/v1/me"));
  },

  async updateProfile(patch: Partial<User>) {
    return mapUser(await request("/api/v1/me", { method: "PATCH", body: JSON.stringify(patch) }));
  },

  async setPlan(plan: PlanId) {
    return mapUser(await request("/api/v1/me/plan", { method: "POST", body: JSON.stringify({ plan }) }));
  },

  async deactivateAccount() {
    await request("/api/v1/me/deactivate", { method: "POST" });
    writeSession(null);
    return { ok: true };
  },

  async types() {
    return [...META_TYPES];
  },

  async frequencies() {
    return [...META_FREQUENCIES];
  },

  async customers() {
    const rows = await request("/api/v1/customers");
    return (rows as Record<string, unknown>[]).map(mapCustomer);
  },

  async addCustomer(name: string, phone: string) {
    return mapCustomer(await request("/api/v1/customers", {
      method: "POST",
      body: JSON.stringify({ name, phone }),
    }));
  },

  async chits() {
    const rows = await request("/api/v1/chits");
    return (rows as Record<string, unknown>[]).map(mapChit);
  },

  async chit(id: string) {
    return mapChit(await request(`/api/v1/chits/${id}`));
  },

  async createChit(input: Omit<Chit, "id" | "payments" | "status">) {
    const created = await request("/api/v1/chits", {
      method: "POST",
      body: JSON.stringify(chitPayload(input)),
    });
    return mapChit(await request(`/api/v1/chits/${created.id}`));
  },

  async cancelChit(id: string) {
    await request(`/api/v1/chits/${id}/cancel`, { method: "POST" });
    return mapChit(await request(`/api/v1/chits/${id}`));
  },

  async addMember(chitId: string, customerId: string) {
    await request(`/api/v1/chits/${chitId}/members`, {
      method: "POST",
      body: JSON.stringify({ customerId }),
    });
    return mapChit(await request(`/api/v1/chits/${chitId}`));
  },

  async updateChitSettings(chitId: string, patch: { memberVisible?: boolean; remindDays?: number[] }) {
    await request(`/api/v1/chits/${chitId}/settings`, {
      method: "POST",
      body: JSON.stringify(patch),
    });
    return mapChit(await request(`/api/v1/chits/${chitId}`));
  },

  async closeCycle(id: string) {
    await request(`/api/v1/chits/${id}/close-cycle`, { method: "POST" });
    return mapChit(await request(`/api/v1/chits/${id}`));
  },

  async recordPayment(chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: PayMode) {
    await request(`/api/v1/chits/${chitId}/payments`, {
      method: "POST",
      body: JSON.stringify({ memberId, amount, kind, mode }),
    });
    return (await mapChit(await request(`/api/v1/chits/${chitId}`))).payments;
  },

  async undoPayment(chitId: string, paymentId: string) {
    await request(`/api/v1/chits/${chitId}/payments/${paymentId}`, { method: "DELETE" });
    return (await mapChit(await request(`/api/v1/chits/${chitId}`))).payments;
  },

  async settlePayout(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"]) {
    return mapAuction(await request(`/api/v1/chits/${chitId}/settle`, {
      method: "POST",
      body: JSON.stringify({ winnerId, bid, method }),
    }));
  },

  async luckyDraw(chitId: string) {
    return mapAuction(await request(`/api/v1/chits/${chitId}/lucky-draw`, { method: "POST" }));
  },

  async tickets() {
    const rows = await request("/api/v1/tickets");
    return (rows as Record<string, unknown>[]).map(mapTicket);
  },

  async addTicket(subject: string, message: string) {
    return mapTicket(await request("/api/v1/tickets", {
      method: "POST",
      body: JSON.stringify({ subject, message }),
    }));
  },
};
