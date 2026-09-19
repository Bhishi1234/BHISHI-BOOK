import { createClient } from "npm:@supabase/supabase-js@2";
import { corsPreflight, hashOtp, json, phone10, randomOtp } from "../_shared/otp.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return corsPreflight();
  try {
    const body = await req.json();
    const phone = phone10(String(body.phone ?? ""));
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: recent } = await admin
      .from("otp_challenges")
      .select("created_at")
      .eq("phone", phone)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
      return json({ error: "Wait 60 seconds before requesting another OTP" }, 429);
    }

    const code = randomOtp();
    const pepper = Deno.env.get("OTP_PEPPER") || "bhishi-book-dev-pepper";
    const { error } = await admin.from("otp_challenges").insert({
      phone,
      code_hash: await hashOtp(phone, code, pepper),
      expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    });
    if (error) return json({ error: error.message }, 500);

    const msg91 = Deno.env.get("MSG91_AUTH_KEY");
    const template = Deno.env.get("MSG91_TEMPLATE_ID");
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

    const dev = Deno.env.get("ALLOW_DEV_OTP") === "1";
    return json({ ok: true, provider: msg91 ? "MSG91" : "DEV", ...(dev ? { devOtp: code } : {}) });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : "Failed to send OTP" }, 400);
  }
});
