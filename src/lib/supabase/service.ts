import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

/**
 * Service-role Supabase client — SERVER ONLY. Bypasses row-level security, so
 * it must never be imported from a client component or exposed to the browser.
 *
 * Used by the storage route (`/api/storage`) to write objects after the
 * caller's artist membership has been verified through their cookie session.
 * This sidesteps a Storage-service quirk where uploads arrive at Postgres as
 * role `authenticated` but with `auth.uid()` unset, so the member-gated
 * `storage.objects` write policies reject every upload.
 */
export function createServiceClient(): SupabaseClient {
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables"
    );
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
