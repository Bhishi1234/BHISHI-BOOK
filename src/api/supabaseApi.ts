import type { AuctionRecord, Chit, PaymentKind, PayMode, PlanId, User } from "../types";
import { getSupabase } from "../lib/supabase";
import { normalizeEmail } from "../lib/email";
import { phone10 } from "../lib/phone";
import { throwIf } from "./errors";
import { chitPayload, mapAuction, mapChit, mapCustomer, mapTicket, mapUser } from "./map";
import { META_FREQUENCIES, META_TYPES } from "./contract";
import { assertCanSettlePayout } from "../lib/chitMath";

const CHIT_SELECT = "*, members:chit_members(*), payments(*), auctions(*)";

async function requireUser() {
  const sb = getSupabase();
  const { data, error } = await sb.auth.getUser();
  throwIf(error);
  if (!data.user) throw new Error("Unauthorized");
  return { sb, user: data.user };
}

function roleFor(row: Record<string, unknown>, userId: string): Chit["viewerRole"] {
  return String(row.owner_id ?? "") === userId ? "owner" : "member";
}

async function loadChit(id: string) {
  const { sb, user } = await requireUser();
  const { data, error } = await sb.from("chits").select(CHIT_SELECT).eq("id", id).single();
  throwIf(error);
  const row = data as Record<string, unknown>;
  return mapChit(row, roleFor(row, user.id));
}

async function loadPayments(chitId: string) {
  return (await loadChit(chitId)).payments;
}

export const supabaseApi = {
  authHint() {
    return "Sign in with your email and password.";
  },

  onAuthChange(cb: () => void) {
    const sb = getSupabase();
    const { data } = sb.auth.onAuthStateChange(() => cb());
    return () => data.subscription.unsubscribe();
  },

  async signUp(email: string, password: string) {
    const addr = normalizeEmail(email);
    if (password.length < 6) throw new Error("Password must be at least 6 characters");
    const sb = getSupabase();
    const { data, error } = await sb.auth.signUp({
      email: addr,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    throwIf(error);
    const confirmed = Boolean(data.user?.email_confirmed_at);
    if (data.session && !confirmed) await sb.auth.signOut();
    return { ok: true as const, needsVerification: !confirmed };
  },

  async signIn(email: string, password: string) {
    const addr = normalizeEmail(email);
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({ email: addr, password });
    throwIf(error);
    await sb.rpc("reactivate_if_allowed");
    return { ok: true as const };
  },

  async logout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    return { ok: true };
  },

  async profile() {
    const { sb, user } = await requireUser();
    const { data, error } = await sb.rpc("reactivate_if_allowed");
    throwIf(error);
    return mapUser({
      ...(data as Record<string, unknown>),
      email: (data as { email?: string })?.email || user.email || "",
    });
  },

  async updateProfile(patch: Partial<User>) {
    const { sb, user } = await requireUser();
    let row: Record<string, unknown> | null = null;

    if (patch.phone !== undefined) {
      const { data, error } = await sb.rpc("set_profile_phone", {
        p_phone: patch.phone === "" || patch.phone == null ? null : String(patch.phone),
      });
      throwIf(error);
      row = data as Record<string, unknown>;
    }

    if (patch.name != null || patch.language != null) {
      const { data, error } = await sb
        .from("profiles")
        .update({
          ...(patch.name != null ? { name: patch.name } : {}),
          ...(patch.language != null ? { language: patch.language } : {}),
        })
        .eq("id", user.id)
        .select("*")
        .single();
      throwIf(error);
      row = data as Record<string, unknown>;
    }

    if (!row) {
      const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
      throwIf(error);
      row = data as Record<string, unknown>;
    }

    return mapUser({
      ...row,
      email: (row.email as string) || user.email || "",
    });
  },

  async setPlan(plan: PlanId) {
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("set_plan", { p_plan: plan });
    throwIf(error);
    return mapUser(data as Record<string, unknown>);
  },

  async deactivateAccount() {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("deactivate_account");
    throwIf(error);
    await sb.auth.signOut();
    return { ok: true };
  },

  async types() {
    return [...META_TYPES];
  },

  async frequencies() {
    return [...META_FREQUENCIES];
  },

  async customers() {
    const { sb } = await requireUser();
    const { data, error } = await sb.from("customers").select("*").eq("active", true).order("name");
    throwIf(error);
    return (data ?? []).map((row) => mapCustomer(row as Record<string, unknown>));
  },

  async addCustomer(name: string, phone: string) {
    const { sb, user } = await requireUser();
    const { data, error } = await sb
      .from("customers")
      .insert({ owner_id: user.id, name: name.trim(), phone: phone10(phone) })
      .select("*")
      .single();
    throwIf(error);
    return mapCustomer(data as Record<string, unknown>);
  },

  async chits() {
    const { sb, user } = await requireUser();
    const { data, error } = await sb.from("chits").select(CHIT_SELECT).order("created_at", { ascending: false });
    throwIf(error);
    return (data ?? []).map((row) => {
      const r = row as Record<string, unknown>;
      return mapChit(r, roleFor(r, user.id));
    });
  },

  async chit(id: string) {
    return loadChit(id);
  },

  async createChit(input: Omit<Chit, "id" | "payments" | "status">) {
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("create_chit", { payload: chitPayload(input) });
    throwIf(error);
    return loadChit(String((data as { id: string }).id));
  },

  async cancelChit(id: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("cancel_chit", { p_chit_id: id });
    throwIf(error);
    return loadChit(id);
  },

  async addMember(chitId: string, customerId: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("add_chit_member", { p_chit_id: chitId, p_customer_id: customerId });
    throwIf(error);
    return loadChit(chitId);
  },

  async updateChitSettings(chitId: string, patch: {
    memberVisible?: boolean;
    remindDays?: number[];
    name?: string;
    title?: string;
  }) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("update_chit_settings", {
      p_chit_id: chitId,
      p_member_visible: patch.memberVisible ?? null,
      p_remind_days: patch.remindDays ?? null,
      p_name: patch.name ?? null,
      p_title: patch.title ?? null,
    });
    throwIf(error);
    return loadChit(chitId);
  },

  async closeCycle(id: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("close_cycle", { p_chit_id: id });
    throwIf(error);
    return loadChit(id);
  },

  async recordPayment(chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: PayMode) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("record_payment", {
      p_chit_id: chitId,
      p_member_id: memberId,
      p_amount: amount,
      p_kind: kind ?? null,
      p_mode: mode ?? "cash",
      p_note: null,
    });
    throwIf(error);
    return loadPayments(chitId);
  },

  async undoPayment(chitId: string, paymentId: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("undo_payment", { p_chit_id: chitId, p_payment_id: paymentId });
    throwIf(error);
    return loadPayments(chitId);
  },

  async settlePayout(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number) {
    const chit = await loadChit(chitId);
    assertCanSettlePayout(chit, winnerId, bid, method, winnerSlot);
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("settle_payout", {
      p_chit_id: chitId,
      p_winner_id: winnerId,
      p_bid: bid,
      p_method: method,
      p_winner_slot: winnerSlot ?? null,
    });
    throwIf(error);
    return mapAuction(data as Record<string, unknown>);
  },

  async luckyDraw(chitId: string) {
    const chit = await loadChit(chitId);
    const pool = chit.members.filter((m) => !m.prizedCycle);
    if (!pool.length) throw new Error("No unprized members left");
    assertCanSettlePayout(chit, pool[0].customerId, chit.pot, "lucky_draw");
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("lucky_draw", { p_chit_id: chitId });
    throwIf(error);
    return mapAuction(data as Record<string, unknown>);
  },

  async tickets() {
    const { sb } = await requireUser();
    const { data, error } = await sb.from("tickets").select("*").order("created_at", { ascending: false });
    throwIf(error);
    return (data ?? []).map((row) => mapTicket(row as Record<string, unknown>));
  },

  async addTicket(subject: string, message: string) {
    const { sb, user } = await requireUser();
    const { data, error } = await sb
      .from("tickets")
      .insert({ owner_id: user.id, subject, message })
      .select("*")
      .single();
    throwIf(error);
    return mapTicket(data as Record<string, unknown>);
  },
};
