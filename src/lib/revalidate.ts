"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/**
 * Purge the Full Route Cache after a client-side RPC write. The album pages
 * are statically cached (`revalidate = 300`, cookie-free anon fetches), so
 * `router.refresh()` alone would keep serving the stale RSC payload for up
 * to 5 minutes in production. Gated on a signed-in session — server actions
 * are public HTTP endpoints, and an unauthenticated caller has no business
 * purging the whole site's cache.
 */
export async function revalidateContent(): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  revalidatePath("/", "layout");
}
