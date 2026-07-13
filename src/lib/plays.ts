/**
 * Listening analytics for Melogram.
 *
 * Records one row per play into `public.track_plays` via the `record_play` RPC.
 * Ported from the old SvelteKit `analytics.ts`, minus the consent gate: plays
 * are logged anonymously using a random UUID kept in localStorage under
 * `melogram_anonymous_id` (no cookies, no IP, no PII). The same key as the old
 * app, so returning visitors keep their anonymous identity. For signed-in users
 * the RPC attributes the play to their account and ignores the anonymous id.
 */
import { createClient } from "@/lib/supabase/client";

/** localStorage key holding the anonymous tracking UUID (shared with the old app). */
const ANONYMOUS_ID_KEY = "melogram_anonymous_id";

/** Minimum milliseconds between two logged plays of the same track+source. */
const PLAY_COOLDOWN_MS = 10_000;

const recentPlays = new Map<string, number>();

function getOrCreateAnonymousId(): string | null {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem(ANONYMOUS_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(ANONYMOUS_ID_KEY, id);
  }
  return id;
}

/**
 * Log a track play. A client-side cooldown suppresses duplicate events for the
 * same track+source within {@link PLAY_COOLDOWN_MS} (the RPC rate-limits too, as
 * a backstop). Errors are swallowed — analytics must never break playback.
 */
export async function recordPlay(trackId: string, source: string): Promise<void> {
  if (!trackId || typeof window === "undefined") return;

  const key = `${trackId}:${source}`;
  const now = Date.now();

  // Prune stale entries to keep the map from growing unbounded.
  for (const [k, ts] of recentPlays) {
    if (now - ts >= PLAY_COOLDOWN_MS) recentPlays.delete(k);
  }

  const last = recentPlays.get(key);
  if (last !== undefined && now - last < PLAY_COOLDOWN_MS) return;
  recentPlays.set(key, now);

  const anonymousId = getOrCreateAnonymousId();
  try {
    await createClient().rpc("record_play", {
      _track_id: trackId,
      _anonymous_id: anonymousId,
      _source: source,
    });
  } catch {
    // Silently ignore — analytics must never break the app.
  }
}
