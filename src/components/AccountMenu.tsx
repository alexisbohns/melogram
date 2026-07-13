/* eslint-disable @next/next/no-img-element */
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Heart, LogIn, LogOut, UserCircle } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import {
  LOCALES,
  LOCALE_COOKIE,
  LOCALE_META,
  type Locale,
} from "@/lib/i18n/config";
import { useLocale, useMessages } from "@/lib/i18n/LocaleProvider";
import UserAvatar from "./UserAvatar";
import styles from "./AccountMenu.module.css";

/**
 * Persist the locale and hard-reload. A full document request re-renders every
 * server component with the new cookie, so there is no client-side key-swap and
 * no flash. Kept at module scope (not inside the component) so writing
 * document.cookie doesn't trip the react-hooks immutability rule.
 */
function persistLocale(next: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  window.location.reload();
}

/**
 * Fixed top-right account control. Opens a popover with account links, a
 * language switcher, and sign in/out — plus a flag pastille for the current
 * locale. Locale + copy come from <LocaleProvider> (server-resolved), never
 * document.cookie, so SSR and hydration match.
 */
export default function AccountMenu() {
  const locale = useLocale();
  const m = useMessages();

  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
      setReady(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Dismiss on outside click / Escape, and move focus into the menu on open.
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    menuRef.current
      ?.querySelector<HTMLElement>('[role^="menuitem"]')
      ?.focus();

    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function signIn() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  function switchLocale(next: Locale) {
    if (next === locale) {
      setOpen(false);
      return;
    }
    persistLocale(next);
  }

  const signedIn = ready && Boolean(user);

  return (
    <div className={styles.wrapper} ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.link}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`${m.account.triggerLabel} (${LOCALE_META[locale].nativeName})`}
        onClick={() => setOpen((o) => !o)}
      >
        {signedIn && user ? (
          <UserAvatar user={user} size={36} />
        ) : (
          <UserCircle size={24} strokeWidth={2} />
        )}
        <img
          className={styles.pastille}
          src={LOCALE_META[locale].flag}
          alt=""
          aria-hidden
        />
      </button>

      {open && (
        <div id="account-menu" role="menu" className={styles.menu} ref={menuRef}>
          {signedIn && (
            <div className={styles.section}>
              <p className={styles.sectionLabel}>{m.account.sectionAccount}</p>
              <Link
                href="/profile"
                role="menuitem"
                className={styles.item}
                onClick={() => setOpen(false)}
              >
                <UserCircle size={18} strokeWidth={2} />
                <span>{m.account.profile}</span>
              </Link>
              <Link
                href="/likes"
                role="menuitem"
                className={styles.item}
                onClick={() => setOpen(false)}
              >
                <Heart size={18} strokeWidth={2} />
                <span>{m.account.myLikes}</span>
              </Link>
            </div>
          )}

          <div className={styles.section}>
            <p className={styles.sectionLabel}>{m.account.language}</p>
            {LOCALES.map((l) => (
              <button
                key={l}
                type="button"
                role="menuitemradio"
                aria-checked={l === locale}
                className={
                  l === locale ? `${styles.item} ${styles.itemActive}` : styles.item
                }
                onClick={() => switchLocale(l)}
              >
                <img
                  className={styles.langFlag}
                  src={LOCALE_META[l].flag}
                  alt=""
                  aria-hidden
                />
                <span>{LOCALE_META[l].nativeName}</span>
                {l === locale && (
                  <Check size={16} strokeWidth={2.5} className={styles.check} />
                )}
              </button>
            ))}
          </div>

          {signedIn ? (
            <form
              action="/auth/signout"
              method="post"
              className={styles.section}
            >
              <button
                type="submit"
                role="menuitem"
                className={`${styles.item} ${styles.itemDanger}`}
              >
                <LogOut size={18} strokeWidth={2} />
                <span>{m.account.signOut}</span>
              </button>
            </form>
          ) : (
            <div className={styles.section}>
              <button
                type="button"
                role="menuitem"
                className={styles.item}
                onClick={signIn}
              >
                <LogIn size={18} strokeWidth={2} />
                <span>{m.account.signIn}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
