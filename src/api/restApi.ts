import type { AuctionRecord, Chit, PaymentKind, PayMode, PlanId, User } from "../types";
import { phone10 } from "../lib/phone";
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
    return "Enter the 6-digit SMS code sent to this number.";
  },

  onAuthChange(_cb: () => void) {
    return () => undefined;
  },

  async sendOtp(phone: string, name?: string) {
    return request("/api/v1/auth/send-otp", {
      method: "POST",
      body: JSON.stringify({ phone: phone10(phone), name: name?.trim() || undefined }),
    });
  },

  async beginSignup(input: { name: string; phone: string; password: string; language?: string }) {
    return request("/api/v1/auth/sign-up", {
      method: "POST",
      body: JSON.stringify({
        phone: phone10(input.phone),
        name: input.name.trim(),
        password: input.password,
        language: input.language || "en",
      }),
    });
  },

  async loginWithPassword(phone: string, password: string) {
    const data = await request("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone: phone10(phone), password }),
    });
    if (!data.session?.access_token) throw new Error("Could not start session");
    writeSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    return { ok: true };
  },

  async beginPasswordReset(phone: string) {
    const data = await request("/api/v1/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ phone: phone10(phone) }),
    });
    return { ok: true as const, provider: data.provider, devOtp: data.devOtp };
  },

  async resetPassword(phone: string, otp: string, newPassword: string) {
    await request("/api/v1/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ phone: phone10(phone), otp, password: newPassword }),
    });
    return { ok: true as const };
  },

  async verifyOtp(
    phone: string,
    otp: string,
    name?: string,
    opts?: { password?: string; language?: string },
  ) {
    const data = await request("/api/v1/auth/verify-otp", {
      method: "POST",
      body: JSON.stringify({
        phone: phone10(phone),
        otp,
        name: name?.trim() || undefined,
        password: opts?.password,
        language: opts?.language,
      }),
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

  async deactivateAccount(reasons?: string[], note?: string) {
    await request("/api/v1/me/deactivate", {
      method: "POST",
      body: JSON.stringify({ reasons: reasons ?? [], note: note ?? null }),
    });
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

  async updateCustomer(id: string, patch: { name?: string; phone?: string }) {
    return mapCustomer(await request(`/api/v1/customers/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    }));
  },

  async chits() {
    const me = await this.profile();
    const rows = await request("/api/v1/chits") as Record<string, unknown>[];
    return rows.map((row) =>
      mapChit(row, String(row.owner_id ?? "") === me.id ? "owner" : "member"),
    );
  },

  async chit(id: string) {
    const me = await this.profile();
    const row = await request(`/api/v1/chits/${id}`) as Record<string, unknown>;
    return mapChit(row, String(row.owner_id ?? "") === me.id ? "owner" : "member");
  },

  async createChit(input: Omit<Chit, "id" | "payments" | "status">) {
    const created = await request("/api/v1/chits", {
      method: "POST",
      body: JSON.stringify(chitPayload(input)),
    });
    return mapChit(await request(`/api/v1/chits/${created.id}`));
  },

  async cancelChit(id: string, reasons?: string[]) {
    await request(`/api/v1/chits/${id}/cancel`, {
      method: "POST",
      body: JSON.stringify({ reasons: reasons ?? [] }),
    });
    return mapChit(await request(`/api/v1/chits/${id}`));
  },

  async exitChitAsMember(id: string) {
    await request(`/api/v1/chits/${id}/exit`, { method: "POST" });
  },

  async addMember(chitId: string, customerId: string) {
    await request(`/api/v1/chits/${chitId}/members`, {
      method: "POST",
      body: JSON.stringify({ customerId }),
    });
    return mapChit(await request(`/api/v1/chits/${chitId}`));
  },

  async removeMember(chitId: string, slot: number) {
    await request(`/api/v1/chits/${chitId}/members/${slot}`, { method: "DELETE" });
    return mapChit(await request(`/api/v1/chits/${chitId}`));
  },

  async swapMember(chitId: string, slot: number, newCustomerId: string) {
    await request(`/api/v1/chits/${chitId}/members/${slot}/swap`, {
      method: "POST",
      body: JSON.stringify({ customerId: newCustomerId }),
    });
    return mapChit(await request(`/api/v1/chits/${chitId}`));
  },

  async updateChitSettings(chitId: string, patch: {
    memberVisible?: boolean;
    remindDays?: number[];
    name?: string;
    title?: string;
  }) {
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

  async recordPayment(chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: PayMode, slot?: number) {
    await request(`/api/v1/chits/${chitId}/payments`, {
      method: "POST",
      body: JSON.stringify({ memberId, amount, kind, mode, slot }),
    });
    return mapChit(await request(`/api/v1/chits/${chitId}`));
  },

  async undoPayment(chitId: string, paymentId: string) {
    await request(`/api/v1/chits/${chitId}/payments/${paymentId}`, { method: "DELETE" });
    return mapChit(await request(`/api/v1/chits/${chitId}`));
  },

  async settlePayout(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number, interestRate?: number) {
    return mapAuction(await request(`/api/v1/chits/${chitId}/settle`, {
      method: "POST",
      body: JSON.stringify({ winnerId, bid, method, winnerSlot, interestRate }),
    }));
  },

  async replaceCycleAward(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number) {
    return mapAuction(await request(`/api/v1/chits/${chitId}/replace-award`, {
      method: "POST",
      body: JSON.stringify({ winnerId, bid, method, winnerSlot }),
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

  async phonesOnApp(_phones: string[]) {
    void _phones;
    return [] as string[];
  },
};
