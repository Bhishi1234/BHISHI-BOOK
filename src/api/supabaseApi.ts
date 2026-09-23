import type { AuctionRecord, Chit, PaymentKind, PayMode, PlanId, User } from "../types";
import { getSupabase } from "../lib/supabase";
import { e164in, phone10 } from "../lib/phone";
import { throwIf } from "./errors";
import { chitPayload, mapAuction, mapChit, mapCustomer, mapTicket, mapUser } from "./map";
import { META_FREQUENCIES, META_TYPES } from "./contract";
import { assertCanSettlePayout } from "../lib/chitMath";

const CHIT_SELECT = "*, members:chit_members(*), payments(*), auctions(*)";

function right10(value: string | null | undefined) {
  return String(value || "").replace(/\D/g, "").slice(-10);
}

async function syncProfilePhone(sb: ReturnType<typeof getSupabase>, digits: string) {
  try {
    await sb.rpc("set_profile_phone", { p_phone: digits });
  } catch {
    // Already linked via handle_new_user or owned by this account.
  }
}

async function syncProfileName(sb: ReturnType<typeof getSupabase>, name: string | undefined) {
  const display = (name || "").trim();
  if (!display) return;
  const { user } = await requireUser();
  await sb
    .from("profiles")
    .update({ name: display })
    .eq("id", user.id);
  try {
    await sb.auth.updateUser({ data: { name: display, phone10: right10(user.phone) } });
  } catch {
    // Metadata update is best-effort.
  }
}

async function requireUser() {
  const sb = getSupabase();
  // Prefer local session (no Auth network round-trip). JWT still goes with PostgREST.
  const { data, error } = await sb.auth.getSession();
  throwIf(error);
  const user = data.session?.user;
  if (!user) throw new Error("Unauthorized");
  return { sb, user };
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

export const supabaseApi = {
  authHint() {
    return "Enter the 6-digit SMS code sent to this number.";
  },

  onAuthChange(cb: () => void) {
    const sb = getSupabase();
    const { data } = sb.auth.onAuthStateChange((event) => {
      // Skip noise that would re-fetch the whole store on every tab focus / token refresh.
      if (event === "INITIAL_SESSION" || event === "TOKEN_REFRESHED") return;
      cb();
    });
    return () => data.subscription.unsubscribe();
  },

  async sendOtp(phone: string, name?: string) {
    const digits = phone10(phone);
    const display = (name || "").trim();
    const sb = getSupabase();
    // Prefer native Supabase Phone Auth (Twilio / MessageBird / etc.).
    const { error } = await sb.auth.signInWithOtp({
      phone: e164in(digits),
      options: {
        data: {
          phone10: digits,
          ...(display ? { name: display } : {}),
        },
      },
    });
    if (!error) return { ok: true as const, provider: "PHONE" };

    // Optional fallback: custom edge function (MSG91 / legacy).
    const invoked = await sb.functions.invoke("auth-otp-send", {
      body: { phone: digits, name: display || undefined },
    });
    if (!invoked.error && invoked.data && !invoked.data.error) {
      return {
        ok: true as const,
        provider: String(invoked.data.provider || "EDGE"),
        devOtp: invoked.data.devOtp as string | undefined,
      };
    }
    throw new Error(error.message || invoked.data?.error || invoked.error?.message || "Could not send OTP");
  },

  async beginSignup(input: { name: string; phone: string; password: string; language?: string }) {
    if ((input.password || "").length < 6) throw new Error("Password must be at least 6 characters");
    // Stash password for verifyOtp — phone OTP creates the session first.
    sessionStorage.setItem(
      "bhishi_signup",
      JSON.stringify({
        password: input.password,
        language: input.language || "en",
        name: input.name.trim(),
      }),
    );
    return this.sendOtp(input.phone, input.name);
  },

  async loginWithPassword(phone: string, password: string) {
    const digits = phone10(phone);
    const sb = getSupabase();
    const { error } = await sb.auth.signInWithPassword({
      phone: e164in(digits),
      password,
    });
    if (error) throw new Error(error.message || "Wrong phone or password");
    await syncProfilePhone(sb, digits);
    await sb.rpc("reactivate_if_allowed");
    return { ok: true };
  },

  async verifyOtp(
    phone: string,
    otp: string,
    name?: string,
    opts?: { password?: string; language?: string },
  ) {
    const digits = phone10(phone);
    const code = otp.replace(/\D/g, "");
    if (code.length !== 6) throw new Error("otp must be 6 digits");
    const sb = getSupabase();

    let stash: { password?: string; language?: string; name?: string } = {};
    try {
      stash = JSON.parse(sessionStorage.getItem("bhishi_signup") || "{}") as typeof stash;
    } catch {
      stash = {};
    }
    const password = opts?.password || stash.password;
    const language = opts?.language || stash.language;
    const displayName = name || stash.name;

    const { error } = await sb.auth.verifyOtp({
      phone: e164in(digits),
      token: code,
      type: "sms",
    });
    if (!error) {
      await syncProfilePhone(sb, digits);
      await syncProfileName(sb, displayName);
      if (language) {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from("profiles").update({ language }).eq("id", user.id);
        }
      }
      if (password && password.length >= 6) {
        const { error: pwErr } = await sb.auth.updateUser({ password });
        if (pwErr) throw new Error(pwErr.message || "Could not set password");
      }
      sessionStorage.removeItem("bhishi_signup");
      await sb.rpc("reactivate_if_allowed");
      return { ok: true };
    }

    const invoked = await sb.functions.invoke("auth-otp-verify", {
      body: { phone: digits, otp: code, name: (displayName || "").trim() || undefined },
    });
    if (!invoked.error && invoked.data?.session) {
      const { error: sessionError } = await sb.auth.setSession({
        access_token: invoked.data.session.access_token,
        refresh_token: invoked.data.session.refresh_token,
      });
      throwIf(sessionError);
      await syncProfilePhone(sb, digits);
      await syncProfileName(sb, displayName);
      if (language) {
        const { data: { user } } = await sb.auth.getUser();
        if (user) {
          await sb.from("profiles").update({ language }).eq("id", user.id);
        }
      }
      if (password && password.length >= 6) {
        const { error: pwErr } = await sb.auth.updateUser({ password });
        if (pwErr) throw new Error(pwErr.message || "Could not set password");
      }
      sessionStorage.removeItem("bhishi_signup");
      await sb.rpc("reactivate_if_allowed");
      return { ok: true };
    }

    throw new Error(error.message || invoked.data?.error || invoked.error?.message || "Invalid OTP");
  },

  async logout() {
    const sb = getSupabase();
    await sb.auth.signOut();
    return { ok: true };
  },

  async profile() {
    const { sb, user } = await requireUser();
    const { data, error } = await sb.from("profiles").select("*").eq("id", user.id).single();
    throwIf(error);
    const phoneFromAuth = right10(user.phone);
    return mapUser({
      ...(data as Record<string, unknown>),
      email: (data as { email?: string })?.email || user.email || "",
      phone: (data as { phone?: string })?.phone || phoneFromAuth || "",
    });
  },

  /** One-shot on app open / login — not on every payment refresh. */
  async ensureActive() {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("reactivate_if_allowed");
    throwIf(error);
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

  async deactivateAccount(reasons?: string[], note?: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("deactivate_account", {
      p_reasons: reasons ?? [],
      p_note: note ?? null,
    });
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

  async updateCustomer(id: string, patch: { name?: string; phone?: string }) {
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("update_customer", {
      p_customer_id: id,
      p_name: patch.name ?? null,
      p_phone: patch.phone ?? null,
    });
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

  async cancelChit(id: string, reasons?: string[]) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("cancel_chit", {
      p_chit_id: id,
      p_reasons: reasons ?? [],
    });
    throwIf(error);
    return loadChit(id);
  },

  async exitChitAsMember(id: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("exit_chit_as_member", { p_chit_id: id });
    throwIf(error);
  },

  async addMember(chitId: string, customerId: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("add_chit_member", { p_chit_id: chitId, p_customer_id: customerId });
    throwIf(error);
    return loadChit(chitId);
  },

  async removeMember(chitId: string, slot: number) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("remove_chit_member", { p_chit_id: chitId, p_slot: slot });
    throwIf(error);
    return loadChit(chitId);
  },

  async swapMember(chitId: string, slot: number, newCustomerId: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("swap_chit_member", {
      p_chit_id: chitId,
      p_slot: slot,
      p_new_customer_id: newCustomerId,
    });
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

  async recordPayment(chitId: string, memberId: string, amount: number, kind?: PaymentKind, mode?: PayMode, slot?: number) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("record_payment", {
      p_chit_id: chitId,
      p_member_id: memberId,
      p_amount: amount,
      p_kind: kind ?? null,
      p_mode: mode ?? "cash",
      p_note: null,
      p_member_slot: slot ?? null,
    });
    throwIf(error);
    return loadChit(chitId);
  },

  async undoPayment(chitId: string, paymentId: string) {
    const { sb } = await requireUser();
    const { error } = await sb.rpc("undo_payment", { p_chit_id: chitId, p_payment_id: paymentId });
    throwIf(error);
    return loadChit(chitId);
  },

  async settlePayout(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number, interestRate?: number) {
    const chit = await loadChit(chitId);
    assertCanSettlePayout(chit, winnerId, bid, method, winnerSlot, interestRate);
    const { sb } = await requireUser();
    const { data, error } = await sb.rpc("settle_payout", {
      p_chit_id: chitId,
      p_winner_id: winnerId,
      p_bid: bid,
      p_method: method,
      p_winner_slot: winnerSlot ?? null,
      p_interest_rate: interestRate ?? null,
    });
    throwIf(error);
    return mapAuction(data as Record<string, unknown>);
  },

  async replaceCycleAward(chitId: string, winnerId: string, bid: number, method: AuctionRecord["method"], winnerSlot?: number) {
    const chit = await loadChit(chitId);
    const cycle = chit.currentCycle;
    const old = chit.auctions.find((a) => a.cycle === cycle && a.method !== "settlement");
    const { sb } = await requireUser();
    if (old) {
      const { error: delErr } = await sb
        .from("auctions")
        .delete()
        .eq("chit_id", chitId)
        .eq("cycle", cycle)
        .neq("method", "settlement");
      throwIf(delErr);
      let q = sb
        .from("chit_members")
        .update({ prized_cycle: null })
        .eq("chit_id", chitId)
        .eq("customer_id", old.winnerId)
        .eq("prized_cycle", cycle);
      if (old.winnerSlot != null) q = q.eq("slot", old.winnerSlot);
      const { error: memErr } = await q;
      throwIf(memErr);
    }
    return this.settlePayout(chitId, winnerId, bid, method, winnerSlot);
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

  async phonesOnApp(phones: string[]) {
    const { sb } = await requireUser();
    const cleaned = [...new Set(
      phones
        .map((p) => String(p || "").replace(/\D/g, "").slice(-10))
        .filter((p) => p.length === 10),
    )];
    if (!cleaned.length) return [];
    const { data, error } = await sb.rpc("phones_on_app", { p_phones: cleaned });
    if (error) {
      // Migration may not be applied yet — fail soft.
      console.warn("phones_on_app", error.message);
      return [];
    }
    return ((data as string[]) || []).filter(Boolean);
  },
};
