import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables"
  );
}

try {
  new URL(url);
} catch {
  // the URL is public (it ships to the client), safe to echo a prefix
  throw new Error(
    `NEXT_PUBLIC_SUPABASE_URL is not a valid URL (value starts with "${url.slice(0, 12)}…")`
  );
}

/** Anonymous read-only client for public content (albums, tracks, lyrics).
 *  Not tied to a user session — auth flows use the browser/server clients. */
export const supabase = createClient(url, anonKey, {
  auth: { persistSession: false },
});
