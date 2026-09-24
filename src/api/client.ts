import { backendMode } from "../lib/supabase";
import { mockServer, delay } from "./mockServer";
import { restApi } from "./restApi";
import { supabaseApi } from "./supabaseApi";
import { META_FREQUENCIES, META_TYPES } from "./contract";
import type { AuctionRecord, Chit, PaymentKind, PayMode, User } from "../types";

type Backend = {
  authHint: () => string;
  onAuthChange: (cb: () => void) => () => void;
  sendOtp: (phone: string, name?: string) => Promise<{ ok: true; provider?: string; devOtp?: string }>;
  beginSignup: (input: {
    name: string;
    phone: string;
    password: string;
    language?: string;
  }) => Promise<{ ok: true; provider?: string; devOtp?: string }>;
  loginWithPassword: (phone: string, password: string) => Promise<unknown>;
  beginPasswordReset: (phone: string) => Promise<{ ok: true; provider?: string; devOtp?: string }>;
  resetPassword: (phone: string, otp: string, newPassword: string) => Promise<{ ok: true }>;
  verifyOtp: (phone: string, otp: string, name?: string, opts?: { password?: string; language?: string }) => Promise<unknown>;
  logout: () => Promise<unknown>;
  profile: () => Promise<User>;
  updateProfile: (patch: Partial<User>) => Promise<User>;
  deactivateAccount: (reasons?: string[], note?: string) => Promise<unknown>;
  types: () => Promise<readonly { id: string; label: string }[]>;
  frequencies: () => Promise<readonly { id: string; label: string }[]>;
  customers: () => Promise<unknown>;
  addCustomer: (name: string, phone: string) => Promise<unknown>;
  updateCustomer: (id: string, patch: { name?: string; phone?: string }) => Promise<unknown>;
  chits: () => Promise<Chit[]>;
  chit: (id: string) => Promise<Chit>;
  createChit: (input: Omit<Chit, "id" | "payments" | "status">) => Promise<Chit>;
  cancelChit: (id: string, reasons?: string[]) => Promise<Chit>;
  exitChitAsMember: (id: string) => Promise<void>;
  addMember: (chitId: string, customerId: string) => Promise<Chit>;
  removeMember: (chitId: string, slot: number) => Promise<Chit>;
  swapMember: (chitId: string, slot: number, newCustomerId: string) => Promise<Chit>;
  updateChitSettings: (chitId: string, patch: {
    memberVisible?: boolean;
    remindDays?: number[];
    name?: string;
    title?: string;
  }) => Promise<Chit>;
  closeCycle: (id: string) => Promise<Chit>;
  recordPayment: (chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: PayMode, slot?: number) => Promise<Chit>;
  undoPayment: (chitId: string, paymentId: string) => Promise<Chit>;
  settlePayout: (chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number, interestRate?: number) => Promise<AuctionRecord>;
  replaceCycleAward: (chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number) => Promise<AuctionRecord>;
  luckyDraw: (chitId: string) => Promise<AuctionRecord>;
  tickets: () => Promise<unknown>;
  addTicket: (subject: string, message: string) => Promise<unknown>;
  /** Phones (10-digit) that already have a Bhishi Circle profile. */
  phonesOnApp: (phones: string[]) => Promise<string[]>;
  ensureActive?: () => Promise<void>;
};

const mockApi: Backend = {
  authHint: () => "Demo login: any 6-digit OTP works until Supabase phone auth is connected.",
  onAuthChange: () => () => undefined,
  sendOtp: (phone, name) => delay(mockServer.auth.sendOtp(phone, name)),
  beginSignup: (input) => delay(mockServer.auth.beginSignup(input)),
  loginWithPassword: (phone, password) => delay(mockServer.auth.loginWithPassword(phone, password)),
  beginPasswordReset: (phone) => delay(mockServer.auth.beginPasswordReset(phone)),
  resetPassword: (phone, otp, newPassword) => delay(mockServer.auth.resetPassword(phone, otp, newPassword)),
  verifyOtp: (phone, otp, name) => delay(mockServer.auth.verifyOtp(phone, otp, name)),
  logout: () => delay(mockServer.auth.logout()),
  profile: () => delay(mockServer.auth.profile()),
  updateProfile: (patch) => delay(mockServer.auth.updateProfile(patch)),
  deactivateAccount: (reasons, note) => delay(mockServer.auth.deactivate(reasons, note)),
  types: () => delay([...META_TYPES]),
  frequencies: () => delay([...META_FREQUENCIES]),
  customers: () => delay(mockServer.customers.list()),
  addCustomer: (name, phone) => delay(mockServer.customers.create(name, phone)),
  updateCustomer: (id, patch) => delay(mockServer.customers.update(id, patch)),
  chits: () => delay(mockServer.chits.list()),
  chit: (id) => delay(mockServer.chits.get(id)),
  createChit: (input) => delay(mockServer.chits.create(input)),
  cancelChit: (id, reasons) => delay(mockServer.chits.cancel(id, reasons)),
  exitChitAsMember: (id) => delay(mockServer.chits.exitAsMember(id)),
  addMember: (chitId, customerId) => delay(mockServer.chits.addMember(chitId, customerId)),
  removeMember: (chitId, slot) => delay(mockServer.chits.removeMember(chitId, slot)),
  swapMember: (chitId, slot, newCustomerId) => delay(mockServer.chits.swapMember(chitId, slot, newCustomerId)),
  updateChitSettings: (chitId, patch) => delay(mockServer.chits.updateSettings(chitId, patch)),
  closeCycle: (id) => delay(mockServer.chits.closeCycle(id)),
  recordPayment: (chitId, memberId, amount, kind, mode, slot) =>
    delay(mockServer.collections.create(chitId, memberId, amount, kind, mode, slot)),
  undoPayment: (chitId, paymentId) => delay(mockServer.collections.undo(chitId, paymentId)),
  settlePayout: (chitId, winnerId, bid, method, winnerSlot, interestRate) =>
    delay(mockServer.auctions.create(chitId, winnerId, bid, method, winnerSlot, interestRate)),
  replaceCycleAward: (chitId, winnerId, bid, method, winnerSlot) =>
    delay(mockServer.auctions.replaceCycleAward(chitId, winnerId, bid, method, winnerSlot)),
  luckyDraw: (chitId) => delay(mockServer.auctions.draw(chitId)),
  tickets: () => delay(mockServer.support.list()),
  addTicket: (subject, message) => delay(mockServer.support.create(subject, message)),
  phonesOnApp: async (phones) => {
    try {
      const raw = localStorage.getItem("bhishi-book-api-v8");
      const db = raw ? JSON.parse(raw) as { accounts?: { phone: string }[] } : { accounts: [] };
      const registered = new Set((db.accounts || []).map((a) => String(a.phone || "").replace(/\D/g, "").slice(-10)));
      return phones
        .map((p) => String(p || "").replace(/\D/g, "").slice(-10))
        .filter((p) => p.length === 10 && registered.has(p));
    } catch {
      return [];
    }
  },
  ensureActive: async () => undefined,
};

function impl(): Backend {
  const mode = backendMode();
  if (mode === "rest") return restApi;
  if (mode === "supabase") return supabaseApi;
  return mockApi;
}

export const api = new Proxy({} as Backend, {
  get(_target, prop) {
    const backend = impl();
    const value = backend[prop as keyof Backend];
    return typeof value === "function" ? value.bind(backend) : value;
  },
});

export const apiMode = backendMode;
