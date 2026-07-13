"use client";

import { createContext, useContext } from "react";
import type { Locale } from "./config";
import type { Messages } from "./messages/en";

/**
 * Feeds the server-resolved locale + messages to client components. Imports
 * only config/types (never ./index), so next/headers never reaches the client
 * bundle. Client components must read locale/messages from here — never from
 * document.cookie during render — so SSR and hydration stay identical.
 */

type LocaleContextValue = { locale: Locale; messages: Messages };

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({
  locale,
  messages,
  children,
}: LocaleContextValue & { children: React.ReactNode }) {
  return (
    <LocaleContext.Provider value={{ locale, messages }}>
      {children}
    </LocaleContext.Provider>
  );
}

function useLocaleContext(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale/useMessages must be used within <LocaleProvider>");
  }
  return ctx;
}

export const useLocale = (): Locale => useLocaleContext().locale;
export const useMessages = (): Messages => useLocaleContext().messages;
