/**
 * Locale Context
 * Provides i18n functionality to all components
 * Triggers re-render when locale changes
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { type Locale, getLocale, setLocale as setI18nLocale, t as translate } from "@/lib/i18n";

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(getLocale());

  const setLocale = useCallback((newLocale: Locale) => {
    setI18nLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: string) => {
    return translate(key);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
