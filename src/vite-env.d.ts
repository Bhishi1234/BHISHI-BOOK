/// <reference types="vite/client" />

declare const __BHISHI_SUPABASE_URL__: string;
declare const __BHISHI_SUPABASE_ANON_KEY__: string;

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_ANON_KEY?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
