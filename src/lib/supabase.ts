import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url =
  (typeof __BHISHI_SUPABASE_URL__ !== "undefined" ? __BHISHI_SUPABASE_URL__ : "") ||
  import.meta.env.VITE_SUPABASE_URL ||
  "";
const anon =
  (typeof __BHISHI_SUPABASE_ANON_KEY__ !== "undefined" ? __BHISHI_SUPABASE_ANON_KEY__ : "") ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "";

export function isSupabaseConfigured() {
  return Boolean(url && anon);
}

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!isSupabaseConfigured()) {
    throw new Error("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to connect Bhishi Book.");
  }
  if (!client) {
    client = createClient(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "bhishi-book-auth",
      },
    });
  }
  return client;
}

export function backendMode(): "rest" | "supabase" | "mock" {
  if (import.meta.env.VITE_API_URL) return "rest";
  if (isSupabaseConfigured()) return "supabase";
  return "mock";
}
