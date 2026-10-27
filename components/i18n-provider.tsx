"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import es from "@/messages/es.json";
import en from "@/messages/en.json";

export type Locale = "es" | "en";
type Messages = typeof es;

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Messages;
}

const dictionaries: Record<Locale, Messages> = { es, en };

const I18nContext = createContext<I18nContextType>({
  locale: "es",
  setLocale: () => {},
  t: es,
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("es");

  useEffect(() => {
    const saved = localStorage.getItem("bidhub_locale") as Locale | null;
    if (saved === "es" || saved === "en") {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem("bidhub_locale", newLocale);
  };

  return (
    <I18nContext.Provider
      value={{
        locale,
        setLocale,
        t: dictionaries[locale],
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
