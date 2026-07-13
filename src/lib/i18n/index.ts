import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, type Locale } from "./config";
import { en, type Messages } from "./messages/en";
import { fr } from "./messages/fr";

/**
 * Server-only i18n helpers. This module imports next/headers, so it must never
 * be imported by a client component — client code reads locale/messages from
 * <LocaleProvider> via ./LocaleProvider instead.
 */

const DICTS: Record<Locale, Messages> = { en, fr };

/** The message dictionary for a locale (both are tiny; no lazy loading). */
export function getMessages(locale: Locale): Messages {
  return DICTS[locale];
}

/** Current locale from the NEXT_LOCALE cookie, sanitized to a known value. */
export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export type { Locale, Messages };
