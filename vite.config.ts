import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const supabaseUrl =
    env.VITE_SUPABASE_URL ||
    env.SUPABASE_URL ||
    env.NEXT_PUBLIC_SUPABASE_URL ||
    "";
  const supabaseAnon =
    env.VITE_SUPABASE_ANON_KEY ||
    env.SUPABASE_ANON_KEY ||
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "";

  return {
    // Relative base so Capacitor Android WebView can load assets from dist/.
    // Web hosting (Vercel etc.) still works with relative asset URLs.
    base: "./",
    plugins: [react()],
    define: {
      __BHISHI_SUPABASE_URL__: JSON.stringify(supabaseUrl),
      __BHISHI_SUPABASE_ANON_KEY__: JSON.stringify(supabaseAnon),
    },
    server: {
      port: 5173,
      host: true,
      proxy: {
        "/api": "http://127.0.0.1:8787",
      },
    },
  };
});
