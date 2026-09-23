import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { e164in, hashOtp, phone10, phoneEmail, randomOtp, randomPassword } from "./lib/otp.ts";
import { normalizeEmail } from "../src/lib/email.ts";

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const anon = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const pepper = process.env.OTP_PEPPER || "bhishi-book-dev-pepper";
const port = Number(process.env.PORT || 8787);

if (!url || !anon) {
  console.warn("Bhishi Circle API: set SUPABASE_URL and SUPABASE_ANON_KEY (and SERVICE_ROLE_KEY for OTP).");
}

function admin() {
  if (!url || !service) throw new Error("Supabase service role is not configured");
  return createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
}

function asUser(token: string): SupabaseClient {
  if (!url || !anon) throw new Error("Supabase is not configured");
  return createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function bearer(c: { req: { header: (name: string) => string | undefined } }) {
  const raw = c.req.header("authorization") || "";
  const token = raw.startsWith("Bearer ") ? raw.slice(7) : "";
  if (!token) throw new Error("Unauthorized");
  return token;
}

function fail(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = /Unauthorized|deactivated|permanently/i.test(message)
    ? 401
    : /not found/i.test(message)
      ? 404
      : /plan allows|already|slots|OTP|phone|Amount/i.test(message)
        ? 400
        : 500;
  return { error: message, status };
}

const app = new Hono();
app.use(
  "/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    allowHeaders: ["authorization", "content-type", "apikey"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/api/v1/health", (c) => c.json({ ok: true, service: "bhishi-book", holdsMoney: false }));

app.get("/api/v1/meta/types", (c) =>
  c.json([
    { id: "auction", label: "Auction chit" },
    { id: "fixed", label: "Fixed & committee" },
    { id: "loan", label: "Loan chit" },
  ]),
);

app.get("/api/v1/meta/frequencies", (c) =>
  c.json([
    { id: "daily", label: "Daily" },
    { id: "weekly", label: "Weekly" },
    { id: "biweekly", label: "Bi Weekly" },
    { id: "monthly", label: "Monthly" },
    { id: "quarterly", label: "Quarterly" },
    { id: "halfyearly", label: "Half Yearly" },
    { id: "yearly", label: "Yearly" },
  ]),
);

app.post("/api/v1/auth/sign-up", async (c) => {
  try {
    const body = await c.req.json();
    const addr = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    if (password.length < 6) return c.json({ error: "Password must be at least 6 characters" }, 400);
    const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.signUp({
      email: addr,
      password,
      options: {
        emailRedirectTo: String(body.redirectTo || `${process.env.SITE_URL || "http://localhost:5173"}/login`),
      },
    });
    if (error) return c.json({ error: error.message }, 400);
    const confirmed = Boolean(data.user?.email_confirmed_at);
    if (data.session && !confirmed) await sb.auth.signOut();
    return c.json({ ok: true, needsVerification: !confirmed });
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/auth/sign-in", async (c) => {
  try {
    const body = await c.req.json();
    const addr = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");
    const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await sb.auth.signInWithPassword({ email: addr, password });
    if (error || !data.session) return c.json({ error: error?.message || "Could not start session" }, 400);
    return c.json({ ok: true, session: data.session, user: data.user });
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/auth/send-otp", async (c) => {
  try {
    const body = await c.req.json();
    if (body.email) {
      const addr = normalizeEmail(String(body.email));
      const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { error } = await sb.auth.signInWithOtp({
        email: addr,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: String(body.redirectTo || `${process.env.SITE_URL || "http://localhost:5173"}/login`),
        },
      });
      if (error) return c.json({ error: error.message }, 400);
      return c.json({ ok: true, provider: "EMAIL" });
    }
    const phone = phone10(String(body.phone ?? ""));
    const sb = admin();
    const { data: recent } = await sb
      .from("otp_challenges")
      .select("created_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return c.json({ error: "Wait 60 seconds before requesting another OTP" }, 429);
    }
    const code = randomOtp();
    const { error } = await sb.from("otp_challenges").insert({
      phone,
      code_hash: await hashOtp(phone, code, pepper),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) return c.json({ error: error.message }, 500);

    const msg91 = process.env.MSG91_AUTH_KEY;
    const template = process.env.MSG91_TEMPLATE_ID;
    if (msg91 && template) {
      await fetch("https://control.msg91.com/api/v5/flow", {
        method: "POST",
        headers: { authkey: msg91, "Content-Type": "application/json" },
        body: JSON.stringify({
          template_id: template,
          short_url: "0",
          recipients: [{ mobiles: `91${phone}`, otp: code }],
        }),
      });
    }
    const dev = process.env.ALLOW_DEV_OTP === "1" || process.env.NODE_ENV !== "production";
    return c.json({ ok: true, provider: msg91 ? "MSG91" : "DEV", ...(dev ? { devOtp: code } : {}) });
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/auth/verify-otp", async (c) => {
  try {
    const body = await c.req.json();
    if (body.email) {
      const addr = normalizeEmail(String(body.email));
      const otp = String(body.otp ?? "").replace(/\D/g, "");
      if (otp.length !== 6) return c.json({ error: "otp must be 6 digits" }, 400);
      const sb = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
      const { data, error } = await sb.auth.verifyOtp({ email: addr, token: otp, type: "email" });
      if (error || !data.session) return c.json({ error: error?.message || "Could not start session" }, 400);
      return c.json({ ok: true, session: data.session, user: data.user });
    }
    const phone = phone10(String(body.phone ?? ""));
    const otp = String(body.otp ?? "").replace(/\D/g, "");
    if (otp.length !== 6) return c.json({ error: "otp must be 6 digits" }, 400);
    const sb = admin();
    const { data: row } = await sb
      .from("otp_challenges")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) return c.json({ error: "Request a new OTP" }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) return c.json({ error: "OTP expired" }, 400);
    if (row.attempts >= 5) return c.json({ error: "Too many attempts" }, 400);
    if ((await hashOtp(phone, otp, pepper)) !== row.code_hash) {
      await sb.from("otp_challenges").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return c.json({ error: "Incorrect OTP" }, 400);
    }
    await sb.from("otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    const email = phoneEmail(phone);
    const password = randomPassword();
    const { data: profile } = await sb.from("profiles").select("id").eq("phone", phone).maybeSingle();
    if (profile?.id) {
      const { error } = await sb.auth.admin.updateUserById(profile.id, {
        password,
        phone: e164in(phone),
        user_metadata: { phone10: phone },
      });
      if (error) return c.json({ error: error.message }, 500);
    } else {
      const created = await sb.auth.admin.createUser({
        email,
        password,
        phone: e164in(phone),
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone10: phone, name: "Organiser" },
      });
      if (created.error && !/already|registered|exists/i.test(created.error.message)) {
        return c.json({ error: created.error.message }, 500);
      }
      if (created.error) {
        const { data: users } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = users.users.find((u) => u.email === email || u.phone === e164in(phone));
        if (!found) return c.json({ error: created.error.message }, 500);
        await sb.auth.admin.updateUserById(found.id, { password, user_metadata: { phone10: phone } });
      }
    }
    const { data: session, error: signErr } = await sb.auth.signInWithPassword({ email, password });
    if (signErr || !session.session) return c.json({ error: signErr?.message || "Could not start session" }, 500);
    return c.json({ ok: true, session: session.session, user: session.user });
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/auth/logout", async (c) => {
  try {
    const token = bearer(c);
    await asUser(token).auth.signOut();
    return c.json({ ok: true });
  } catch {
    return c.json({ ok: true });
  }
});

function rpcError(error: { message: string } | null) {
  if (!error) return null;
  return error.message.replace(/^.*:\s*/, "");
}

app.get("/api/v1/me", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb.rpc("reactivate_if_allowed");
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.patch("/api/v1/me", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const patch = await c.req.json();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);

    let row: Record<string, unknown> | null = null;
    if (patch.phone !== undefined) {
      const { data, error } = await sb.rpc("set_profile_phone", {
        p_phone: patch.phone === "" || patch.phone == null ? null : String(patch.phone),
      });
      if (error) return c.json({ error: rpcError(error) }, 400);
      row = data as Record<string, unknown>;
    }
    if (patch.name != null || patch.language != null) {
      const { data, error } = await sb
        .from("profiles")
        .update({
          ...(patch.name != null ? { name: patch.name } : {}),
          ...(patch.language != null ? { language: patch.language } : {}),
        })
        .eq("id", auth.user.id)
        .select("*")
        .single();
      if (error) return c.json({ error: error.message }, 400);
      row = data as Record<string, unknown>;
    }
    if (!row) {
      const { data, error } = await sb.from("profiles").select("*").eq("id", auth.user.id).single();
      if (error) return c.json({ error: error.message }, 400);
      row = data as Record<string, unknown>;
    }
    return c.json(row);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/me/plan", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { plan } = await c.req.json();
    const { data, error } = await sb.rpc("set_plan", { p_plan: plan });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/me/deactivate", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { error } = await sb.rpc("deactivate_account");
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json({ ok: true });
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.get("/api/v1/customers", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb.from("customers").select("*").eq("active", true).order("name");
    if (error) return c.json({ error: error.message }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/customers", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const body = await c.req.json();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const { data, error } = await sb
      .from("customers")
      .insert({ owner_id: auth.user.id, name: body.name, phone: String(body.phone).replace(/\D/g, "").slice(-10) })
      .select("*")
      .single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.get("/api/v1/chits", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb
      .from("chits")
      .select("*, members:chit_members(*), payments(*), auctions(*)")
      .order("created_at", { ascending: false });
    if (error) return c.json({ error: error.message }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.get("/api/v1/chits/:id", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb
      .from("chits")
      .select("*, members:chit_members(*), payments(*), auctions(*)")
      .eq("id", c.req.param("id"))
      .single();
    if (error) return c.json({ error: error.message }, 404);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const payload = await c.req.json();
    const { data, error } = await sb.rpc("create_chit", { payload });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/cancel", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb.rpc("cancel_chit", { p_chit_id: c.req.param("id") });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/members", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { customerId } = await c.req.json();
    const { data, error } = await sb.rpc("add_chit_member", {
      p_chit_id: c.req.param("id"),
      p_customer_id: customerId,
    });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/settings", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const body = await c.req.json();
    const { data, error } = await sb.rpc("update_chit_settings", {
      p_chit_id: c.req.param("id"),
      p_member_visible: body.memberVisible ?? null,
      p_remind_days: body.remindDays ?? null,
      p_name: body.name ?? null,
      p_title: body.title ?? null,
    });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/close-cycle", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb.rpc("close_cycle", { p_chit_id: c.req.param("id") });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/payments", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const body = await c.req.json();
    const { data, error } = await sb.rpc("record_payment", {
      p_chit_id: c.req.param("id"),
      p_member_id: body.memberId,
      p_amount: body.amount,
      p_kind: body.kind ?? null,
      p_mode: body.mode ?? "cash",
      p_note: body.note ?? null,
      p_member_slot: body.slot ?? null,
    });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.delete("/api/v1/chits/:id/payments/:paymentId", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { error } = await sb.rpc("undo_payment", {
      p_chit_id: c.req.param("id"),
      p_payment_id: c.req.param("paymentId"),
    });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json({ ok: true });
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/settle", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const body = await c.req.json();
    const { data, error } = await sb.rpc("settle_payout", {
      p_chit_id: c.req.param("id"),
      p_winner_id: body.winnerId,
      p_bid: body.bid,
      p_method: body.method,
      p_winner_slot: body.winnerSlot ?? null,
    });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/replace-award", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const chitId = c.req.param("id");
    const body = await c.req.json();
    const { data: chitRow, error: chitErr } = await sb.from("chits").select("current_cycle").eq("id", chitId).single();
    if (chitErr) return c.json({ error: chitErr.message }, 400);
    const cycle = chitRow.current_cycle as number;
    const { data: oldRows } = await sb
      .from("auctions")
      .select("winner_id, winner_slot")
      .eq("chit_id", chitId)
      .eq("cycle", cycle)
      .neq("method", "settlement");
    const old = oldRows?.[0];
    if (old) {
      const { error: delErr } = await sb
        .from("auctions")
        .delete()
        .eq("chit_id", chitId)
        .eq("cycle", cycle)
        .neq("method", "settlement");
      if (delErr) return c.json({ error: delErr.message }, 400);
      let memQ = sb
        .from("chit_members")
        .update({ prized_cycle: null })
        .eq("chit_id", chitId)
        .eq("customer_id", old.winner_id)
        .eq("prized_cycle", cycle);
      if (old.winner_slot != null) memQ = memQ.eq("slot", old.winner_slot);
      const { error: memErr } = await memQ;
      if (memErr) return c.json({ error: memErr.message }, 400);
    }
    const { data, error } = await sb.rpc("settle_payout", {
      p_chit_id: chitId,
      p_winner_id: body.winnerId,
      p_bid: body.bid,
      p_method: body.method,
      p_winner_slot: body.winnerSlot ?? null,
    });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/chits/:id/lucky-draw", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb.rpc("lucky_draw", { p_chit_id: c.req.param("id") });
    if (error) return c.json({ error: rpcError(error) }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.get("/api/v1/tickets", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const { data, error } = await sb.from("tickets").select("*").order("created_at", { ascending: false });
    if (error) return c.json({ error: error.message }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

app.post("/api/v1/tickets", async (c) => {
  try {
    const sb = asUser(bearer(c));
    const body = await c.req.json();
    const { data: auth } = await sb.auth.getUser();
    if (!auth.user) return c.json({ error: "Unauthorized" }, 401);
    const { data, error } = await sb
      .from("tickets")
      .insert({ owner_id: auth.user.id, subject: body.subject, message: body.message })
      .select("*")
      .single();
    if (error) return c.json({ error: error.message }, 400);
    return c.json(data);
  } catch (e) {
    const { error, status } = fail(e);
    return c.json({ error }, status);
  }
});

serve({ fetch: app.fetch, port }, () => {
  console.log(`Bhishi Circle API listening on http://127.0.0.1:${port}`);
});
