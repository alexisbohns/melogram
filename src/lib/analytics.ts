/**
 * Listening analytics for Melogram.
 *
 * GDPR considerations
 * -------------------
 * - Analytics are only collected after the user has explicitly accepted via
 *   the consent banner (ePrivacy Directive compliance).
 * - For unauthenticated users a randomly generated UUID is stored in
 *   `localStorage` under the key `melogram_anonymous_id`. It contains no
 *   personally identifiable information (PII).
 * - Authenticated users' plays are linked to their Supabase account on the
 *   server side; the anonymous ID is ignored in that case.
 * - No cookies are used for tracking.
 * - Users can remove their anonymous tracking ID at any time by declining
 *   consent (calls `denyConsent()` which removes the key) or by calling
 *   `clearAnonymousId()` directly.
 */
import { hasAnalyticsConsent, ANONYMOUS_ID_KEY } from '$lib/consent';

/** Minimum milliseconds between two logged plays of the same track+source. */
const PLAY_COOLDOWN_MS = 10_000;

const recentPlays = new Map<string, number>();

function getOrCreateAnonymousId(): string {
	if (typeof window === 'undefined') return '';
	let id = localStorage.getItem(ANONYMOUS_ID_KEY);
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem(ANONYMOUS_ID_KEY, id);
	}
	return id;
}

/** Remove the locally stored anonymous tracking ID. */
export function clearAnonymousId(): void {
	if (typeof window !== 'undefined') {
		localStorage.removeItem(ANONYMOUS_ID_KEY);
	}
}

/**
 * Log a track play event to the server.
 *
 * A client-side cooldown prevents the same track+source from being logged
 * more than once within {@link PLAY_COOLDOWN_MS} milliseconds, guarding
 * against accidental duplicate events while still allowing repeated plays
 * in repeat mode (as long as the song is longer than the cooldown window).
 */
export async function logPlay(trackId: string, source: string): Promise<void> {
	if (!trackId) return;
	if (!hasAnalyticsConsent()) return;

	const key = `${trackId}:${source}`;
	const now = Date.now();

	// Prune entries that are past the cooldown window to prevent unbounded growth.
	for (const [k, ts] of recentPlays) {
		if (now - ts >= PLAY_COOLDOWN_MS) recentPlays.delete(k);
	}

	const last = recentPlays.get(key);
	if (last !== undefined && now - last < PLAY_COOLDOWN_MS) {
		return;
	}
	recentPlays.set(key, now);

	const anonymousId = getOrCreateAnonymousId();
	try {
		await fetch('/api/track-plays', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ track_id: trackId, source, anonymous_id: anonymousId })
		});
	} catch {
		// Silently ignore network errors – analytics must never break the app.
	}
}
