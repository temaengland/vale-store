"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Locale, translations } from "@/lib/translations";

const STORAGE_KEY = "charmchase-locale";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (saved && translations[saved]) setLocaleState(saved);
    } catch {
      // Storage unavailable — just stay on English.
    }
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    try {
      window.localStorage.setItem(STORAGE_KEY, l);
    } catch {
      // Ignore — the choice just won't persist across visits.
    }
  }

  function t(key: string): string {
    return translations[locale]?.[key] ?? translations.en[key] ?? key;
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within a LanguageProvider");
  return ctx;
}
