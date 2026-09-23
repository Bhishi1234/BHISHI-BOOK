import { backendMode } from "../lib/supabase";
import { mockServer, delay } from "./mockServer";
import { restApi } from "./restApi";
import { supabaseApi } from "./supabaseApi";
import { META_FREQUENCIES, META_TYPES } from "./contract";
import type { AuctionRecord, Chit, PaymentKind, PayMode, PlanId, User } from "../types";

type Backend = {
  authHint: () => string;
  onAuthChange: (cb: () => void) => () => void;
  sendOtp: (phone: string, name?: string) => Promise<{ ok: true; provider?: string; devOtp?: string }>;
  verifyOtp: (phone: string, otp: string, name?: string) => Promise<unknown>;
  logout: () => Promise<unknown>;
  profile: () => Promise<User>;
  updateProfile: (patch: Partial<User>) => Promise<User>;
  setPlan: (plan: PlanId) => Promise<User>;
  deactivateAccount: () => Promise<unknown>;
  types: () => Promise<readonly { id: string; label: string }[]>;
  frequencies: () => Promise<readonly { id: string; label: string }[]>;
  customers: () => Promise<unknown>;
  addCustomer: (name: string, phone: string) => Promise<unknown>;
  chits: () => Promise<Chit[]>;
  chit: (id: string) => Promise<Chit>;
  createChit: (input: Omit<Chit, "id" | "payments" | "status">) => Promise<Chit>;
  cancelChit: (id: string) => Promise<Chit>;
  addMember: (chitId: string, customerId: string) => Promise<Chit>;
  updateChitSettings: (chitId: string, patch: {
    memberVisible?: boolean;
    remindDays?: number[];
    name?: string;
    title?: string;
  }) => Promise<Chit>;
  closeCycle: (id: string) => Promise<Chit>;
  recordPayment: (chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: PayMode, slot?: number) => Promise<Chit>;
  undoPayment: (chitId: string, paymentId: string) => Promise<Chit>;
  settlePayout: (chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number) => Promise<AuctionRecord>;
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
  verifyOtp: (phone, otp, name) => delay(mockServer.auth.verifyOtp(phone, otp, name)),
  logout: () => delay(mockServer.auth.logout()),
  profile: () => delay(mockServer.auth.profile()),
  updateProfile: (patch) => delay(mockServer.auth.updateProfile(patch)),
  setPlan: (plan) => delay(mockServer.auth.setPlan(plan)),
  deactivateAccount: () => delay(mockServer.auth.deactivate()),
  types: () => delay([...META_TYPES]),
  frequencies: () => delay([...META_FREQUENCIES]),
  customers: () => delay(mockServer.customers.list()),
  addCustomer: (name, phone) => delay(mockServer.customers.create(name, phone)),
  chits: () => delay(mockServer.chits.list()),
  chit: (id) => delay(mockServer.chits.get(id)),
  createChit: (input) => delay(mockServer.chits.create(input)),
  cancelChit: (id) => delay(mockServer.chits.cancel(id)),
  addMember: (chitId, customerId) => delay(mockServer.chits.addMember(chitId, customerId)),
  updateChitSettings: (chitId, patch) => delay(mockServer.chits.updateSettings(chitId, patch)),
  closeCycle: (id) => delay(mockServer.chits.closeCycle(id)),
  recordPayment: (chitId, memberId, amount, kind, mode, slot) =>
    delay(mockServer.collections.create(chitId, memberId, amount, kind, mode, slot)),
  undoPayment: (chitId, paymentId) => delay(mockServer.collections.undo(chitId, paymentId)),
  settlePayout: (chitId, winnerId, bid, method, winnerSlot) =>
    delay(mockServer.auctions.create(chitId, winnerId, bid, method, winnerSlot)),
  replaceCycleAward: (chitId, winnerId, bid, method, winnerSlot) =>
    delay(mockServer.auctions.replaceCycleAward(chitId, winnerId, bid, method, winnerSlot)),
  luckyDraw: (chitId) => delay(mockServer.auctions.draw(chitId)),
  tickets: () => delay(mockServer.support.list()),
  addTicket: (subject, message) => delay(mockServer.support.create(subject, message)),
  phonesOnApp: async (phones) => {
    // Demo: treat no customer phones as registered (always show invite).
    void phones;
    return [];
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
