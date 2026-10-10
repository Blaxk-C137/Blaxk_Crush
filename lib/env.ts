/**
 * Backend mode detection.
 *
 * CrushBoard runs in two modes:
 *  - **Supabase mode (production):** all three Supabase env vars are present.
 *    Auth, database, storage and edge functions all run against Supabase.
 *  - **Demo mode (zero-config):** no env vars required. A seeded in-memory
 *    backend + demo login let anyone evaluate every flow locally in seconds.
 *
 * This module is import-safe on both client and server (it only reads
 * NEXT_PUBLIC_* vars).
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export const DEMO_SESSION_COOKIE = "cb_demo_session";
export const DEMO_USER_ID = "d3a0c001-0000-4000-8000-000000000001";
