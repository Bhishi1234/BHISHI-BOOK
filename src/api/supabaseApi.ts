import type { AuctionRecord, Chit, PaymentKind, PayMode, PlanId, User } from "../types";
import { getSupabase } from "../lib/supabase";
import { e164in, phone10 } from "../lib/phone";
import { throwIf } from "./errors";
import { chitPayload, mapAuction, mapChit, mapCustomer, mapTicket, mapUser } from "./map";
import { META_FREQUENCIES, META_TYPES } from "./contract";

const CHIT_SELECT = "*, members:chit_members(*), payments(*), auctions(*)";

async function requireUser() {
  const sb = getSupabase();
  const { data, error } = await sb.auth.getUser();
  throwIf(error);
  if (!data.user) throw new Error("Unauthorized");
  return { sb, user: data.user };
}

async function loadChit(id: string) {
  const { sb } = await requireUser();
  const { data, error } = await sb.from("chits").select(CHIT_SELECT).eq("id", id).single();
  throwIf(error);
  return mapChit(data as Record<string, unknown>);
}

async function loadPayments(chitId: string) {
  return (await loadChit(chitId)).payments;
}

export const supabaseApi = {
  authHint() {
    return "Enter the 6-digit code sent to this number.";
  },

  onAuthChange(cb: () => void) {
    const sb = getSupabase();
    const { data } = sb.auth.onAuthStateChange(() => cb());
    return () => data.subscription.unsubscribe();
  },

  async sendOtp(phone: string) {
    const digits = phone10(phone);
    const sb = getSupabase();
    const invoked = await sb.functions.invoke("auth-otp-send", { body: { phone: digits } });
    if (!invoked.error && invoked.data && !invoked.data.error) {
      return { ok: true as const, provider: String(invoked.data.provider || "SUPABASE"), devOtp: invoked.data.devOtp as string | undefined };
    }
    const { error } = await sb.auth.signInWithOtp({ phone: e164in(digits) });
    if (error) {
      throw new Error(invoked.data?.error || invoked.error?.message || error.message);
    }
    return { ok: true as const, provider: "PHONE" };
  },

  async verifyOtp(phone: string, otp: string) {
    const digits = phone10(phone);
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) throw new Error("otp must be 6 digits");
    const sb = getSupabase();
    const invoked = await sb.functions.invoke("auth-otp-verify", { body: { phone: digits, otp: code } });
    if (!invoked.error && invoked.data?.session) {
      const { error } = await sb.auth.setSession({
        access_token: invoked.data.session.access_token,
        refresh_token: invoked.data.session.refresh_token,
      });
      throwIf(error);
      await sb.rpc("reactivate_if_allowed");
      return { ok: true };
    }
    const { error } = await sb.auth.verifyOtp({ phone: e164in(digits), token: code, type: "sms" });
    if (error) throw new Error(invoked.data?.error || invoked.error?.message || error.message);
    await sb.rpc("reactivate_if_allowed");
    return { ok: true };
  },

  async logout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    return { ok: true };
  },

  async profile() {
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("reactivate_if_allowed");
    throwIf(error);
    return mapUser(data as Record<string, unknown>);
  },

  async updateProfile(patch: Partial<User>) {
    const { sb, user } = await requireUser();
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
    return mapUser(data as Record<string, unknown>);
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
    const { sb } = await requireUser();
    const { data, error } = await sb.from("chits").select(CHIT_SELECT).order("created_at", { ascending: false });
    throwIf(error);
    return (data ?? []).map((row) => mapChit(row as Record<string, unknown>));
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

  async updateChitSettings(chitId: string, patch: { memberVisible?: boolean; remindDays?: number[] }) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("update_chit_settings", {
      p_chit_id: chitId,
      p_member_visible: patch.memberVisible ?? null,
      p_remind_days: patch.remindDays ?? null,
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

  async settlePayout(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"]) {
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("settle_payout", {
      p_chit_id: chitId,
      p_winner_id: winnerId,
      p_bid: bid,
      p_method: method,
    });
    throwIf(error);
    return mapAuction(data as Record<string, unknown>);
  },

  async luckyDraw(chitId: string) {
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
