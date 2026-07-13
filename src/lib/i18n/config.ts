/**
 * Locale configuration — client-safe (no next/headers), so both server and
 * client components can import it. The message dictionaries live separately in
 * ./messages; anything language-neutral (endonyms, flag assets) stays here.
 */

export const LOCALES = ["en", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Cookie the switcher writes and the server layout reads. */
export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Native language name + flag asset, shown in the switcher and the pastille. */
export const LOCALE_META: Record<Locale, { nativeName: string; flag: string }> = {
  en: { nativeName: "English", flag: "/icons/gb.svg" },
  fr: { nativeName: "Français", flag: "/icons/fr.svg" },
};

/** Narrows an arbitrary cookie value to a supported Locale. */
export function isLocale(value: string | undefined): value is Locale {
  return !!value && (LOCALES as readonly string[]).includes(value);
}
