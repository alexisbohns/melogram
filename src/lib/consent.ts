/**
 * Analytics consent management.
 *
 * Consent state is persisted in `localStorage` so that the decision
 * survives page reloads without using a cookie.
 *
 * Values
 *   'granted' — user accepted analytics
 *   'denied'  — user declined analytics
 *   null      — no decision yet (show the banner)
 */
import { writable } from 'svelte/store';

export type ConsentState = 'granted' | 'denied' | null;

const CONSENT_KEY = 'melogram_analytics_consent';
const ANONYMOUS_ID_KEY = 'melogram_anonymous_id';

function readConsent(): ConsentState {
	if (typeof window === 'undefined') return null;
	const stored = localStorage.getItem(CONSENT_KEY);
	if (stored === 'granted' || stored === 'denied') return stored as ConsentState;
	return null;
}

/** Reactive store — use in Svelte components to show/hide the banner. */
export const analyticsConsent = writable<ConsentState>(readConsent());

/**
 * Synchronous check — use in non-reactive code (e.g. `analytics.ts`).
 * Safe to call outside a Svelte component.
 */
export function hasAnalyticsConsent(): boolean {
	if (typeof window === 'undefined') return false;
	return localStorage.getItem(CONSENT_KEY) === 'granted';
}

/** Accept analytics tracking. */
export function grantConsent(): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(CONSENT_KEY, 'granted');
	analyticsConsent.set('granted');
}

/**
 * Decline analytics tracking.
 * Also removes any anonymous ID that may have been created before
 * the user made a decision.
 */
export function denyConsent(): void {
	if (typeof window === 'undefined') return;
	localStorage.setItem(CONSENT_KEY, 'denied');
	localStorage.removeItem(ANONYMOUS_ID_KEY);
	analyticsConsent.set('denied');
}
