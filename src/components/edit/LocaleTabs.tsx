"use client";

import { LOCALES, type Locale } from "@/lib/i18n/config";
import styles from "./LocaleTabs.module.css";

/**
 * Which language of a bilingual field is being edited. A view concern only —
 * both locales' values stay in the form state and are submitted together,
 * because update_track and update_album overwrite every column.
 */
export default function LocaleTabs({
  value,
  onChange,
  disabled = false,
}: {
  value: Locale;
  onChange: (locale: Locale) => void;
  disabled?: boolean;
}) {
  return (
    <div className={styles.tabs} role="group" aria-label="Editing language">
      {LOCALES.map((locale) => (
        <button
          key={locale}
          type="button"
          className={`${styles.tab} ${value === locale ? styles.active : ""}`}
          aria-pressed={value === locale}
          disabled={disabled}
          onClick={() => onChange(locale)}
        >
          {locale.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
