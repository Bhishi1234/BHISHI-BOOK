import { createClient } from "npm:@supabase/supabase-js@2";
import {
  corsPreflight,
  e164in,
  hashOtp,
  json,
  phone10,
  phoneEmail,
  randomPassword,
} from "../_shared/otp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  try {
    const body = await req.json();
    const phone = phone10(String(body.phone ?? ""));
    const otp = String(body.otp ?? "").replace(/\D/g, "");
    if (otp.length !== 6) return json({ error: "otp must be 6 digits" }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error: findErr } = await admin
      .from("otp_challenges")
      .select("*")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (findErr) return json({ error: findErr.message }, 500);
    if (!row) return json({ error: "Request a new OTP" }, 400);
    if (new Date(row.expires_at).getTime() < Date.now()) {
      return json({ error: "OTP expired" }, 400);
    }
    if (row.attempts >= 5) return json({ error: "Too many attempts" }, 400);

    const pepper = Deno.env.get("OTP_PEPPER") || "bhishi-book-dev-pepper";
    const incoming = await hashOtp(phone, otp, pepper);
    if (incoming !== row.code_hash) {
      await admin.from("otp_challenges").update({ attempts: row.attempts + 1 }).eq("id", row.id);
      return json({ error: "Incorrect OTP" }, 400);
    }

    await admin.from("otp_challenges").update({ consumed_at: new Date().toISOString() }).eq("id", row.id);

    const email = phoneEmail(phone);
    const password = randomPassword();
    const { data: profile } = await admin.from("profiles").select("id").eq("phone", phone).maybeSingle();

    if (profile?.id) {
      const { error } = await admin.auth.admin.updateUserById(profile.id, {
        password,
        phone: e164in(phone),
        user_metadata: { phone10: phone },
      });
      if (error) return json({ error: error.message }, 500);
    } else {
      const { error } = await admin.auth.admin.createUser({
        email,
        password,
        phone: e164in(phone),
        email_confirm: true,
        phone_confirm: true,
        user_metadata: { phone10: phone, name: "Organiser" },
      });
      if (error && !/already|registered|exists/i.test(error.message)) {
        return json({ error: error.message }, 500);
      }
      if (error) {
        const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const found = users.users.find((u) => u.email === email || u.phone === e164in(phone));
        if (!found) return json({ error: error.message }, 500);
        await admin.auth.admin.updateUserById(found.id, { password, user_metadata: { phone10: phone } });
      }
    }

    const { data: session, error: signErr } = await admin.auth.signInWithPassword({ email, password });
    if (signErr || !session.session) {
      return json({ error: signErr?.message || "Could not start session" }, 500);
    }
    return json({
      ok: true,
      session: session.session,
      user: session.user,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed to verify OTP" }, 400);
  }
});
