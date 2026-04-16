import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { Language, LANGUAGES, TranslationKeys } from "./types";
import { en } from "./translations/en";
import { ur } from "./translations/ur";
import { ar } from "./translations/ar";
import { hi } from "./translations/hi";
import { fr } from "./translations/fr";
import { de } from "./translations/de";
import { es } from "./translations/es";

const translations: Record<Language, TranslationKeys> = { en, ur, ar, hi, fr, de, es };

interface I18nContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: keyof TranslationKeys) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
  dir: "ltr",
});

export const useI18n = () => useContext(I18nContext);

const STORAGE_KEY = "nearconnect_lang";

function getInitialLang(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && translations[saved as Language]) return saved as Language;
  } catch {}
  // Detect browser language
  const browserLang = navigator.language.slice(0, 2);
  if (translations[browserLang as Language]) return browserLang as Language;
  return "en";
}

export const I18nProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Language>(getInitialLang);

  const setLang = useCallback((newLang: Language) => {
    setLangState(newLang);
    try { localStorage.setItem(STORAGE_KEY, newLang); } catch {}
  }, []);

  const dir = LANGUAGES.find(l => l.code === lang)?.dir || "ltr";

  // Apply dir and lang to html element
  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang, dir]);

  const t = useCallback((key: keyof TranslationKeys): string => {
    return translations[lang]?.[key] || translations.en[key] || key;
  }, [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t, dir }}>
      {children}
    </I18nContext.Provider>
  );
};

export { LANGUAGES };
export type { Language, TranslationKeys };
