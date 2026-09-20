import { backendMode } from "../lib/supabase";
import { mockServer, delay } from "./mockServer";
import { restApi } from "./restApi";
import { supabaseApi } from "./supabaseApi";
import { META_FREQUENCIES, META_TYPES } from "./contract";
import type { AuctionRecord, Chit, PaymentKind, PayMode, PlanId, User } from "../types";

type Backend = {
  authHint: () => string;
  onAuthChange: (cb: () => void) => () => void;
  signUp: (email: string, password: string) => Promise<{ ok: true; needsVerification: boolean }>;
  signIn: (email: string, password: string) => Promise<unknown>;
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
  recordPayment: (chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: PayMode) => Promise<unknown>;
  undoPayment: (chitId: string, paymentId: string) => Promise<unknown>;
  settlePayout: (chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number) => Promise<AuctionRecord>;
  luckyDraw: (chitId: string) => Promise<AuctionRecord>;
  tickets: () => Promise<unknown>;
  addTicket: (subject: string, message: string) => Promise<unknown>;
};

const mockApi: Backend = {
  authHint: () => "Sign in with your email and password.",
  onAuthChange: () => () => undefined,
  signUp: (email, password) => delay(mockServer.auth.signUp(email, password)),
  signIn: (email, password) => delay(mockServer.auth.signIn(email, password)),
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
  recordPayment: (chitId, memberId, amount, kind, mode) =>
    delay(mockServer.collections.create(chitId, memberId, amount, kind, mode)),
  undoPayment: (chitId, paymentId) => delay(mockServer.collections.undo(chitId, paymentId)),
  settlePayout: (chitId, winnerId, bid, method, winnerSlot) =>
    delay(mockServer.auctions.create(chitId, winnerId, bid, method, winnerSlot)),
  luckyDraw: (chitId) => delay(mockServer.auctions.draw(chitId)),
  tickets: () => delay(mockServer.support.list()),
  addTicket: (subject, message) => delay(mockServer.support.create(subject, message)),
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
