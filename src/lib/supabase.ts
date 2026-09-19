import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL || "";
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

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
        detectSessionInUrl: false,
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
