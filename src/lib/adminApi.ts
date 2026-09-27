import { getSupabase, isSupabaseConfigured } from "./supabase";

const TOKEN_KEY = "bhishi-owner-admin";

export function adminToken() {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function setAdminToken(token: string) {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private mode */
  }
}

function failMessage(error: { message?: string } | null, fallback: string) {
  const message = error?.message || fallback;
  if (/unauthorized/i.test(message)) return "Unauthorized";
  return message.replace(/^.*?:\s*/, "");
}

export async function adminSignIn(phone: string, password: string) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured in this build.");
  const sb = getSupabase();
  const { data, error } = await sb.rpc("admin_sign_in", {
    p_phone: phone,
    p_password: password,
  });
  if (error || !data) throw new Error(failMessage(error, "Could not sign in"));
  const token = String(data);
  setAdminToken(token);
  return token;
}

export async function adminSignOut() {
  const token = adminToken();
  clearAdminToken();
  if (!token || !isSupabaseConfigured()) return;
  try {
    await getSupabase().rpc("admin_sign_out", { p_token: token });
  } catch {
    /* local session is already cleared */
  }
}

export async function adminReport<T>(section: string): Promise<T> {
  const token = adminToken();
  if (!token) throw new Error("Unauthorized");
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured in this build.");
  const { data, error } = await getSupabase().rpc("admin_report", {
    p_token: token,
    p_section: section,
  });
  if (error) throw new Error(failMessage(error, "Could not load this report"));
  return data as T;
}

export function recordLandingVisit(path: string) {
  if (!isSupabaseConfigured()) return;
  const day = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const key = `bhishi-visit-${day}-${path}`;
  try {
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
  } catch {
    return;
  }
  void getSupabase().rpc("record_site_visit", { p_path: path }).then(
    () => undefined,
    () => undefined,
  );
}
