import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Lang } from "../../shared/types";
import ar from "./ar.json";
import en from "./en.json";

const DICTS: Record<Lang, Record<string, string>> = { ar, en };
const KEY = "dara.lang";

interface I18n {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: keyof typeof ar) => string;
}

const Ctx = createContext<I18n | null>(null);

/**
 * English by default, as the submitted app opens.
 *
 * The choice is kept for this browsing session only — sessionStorage, not
 * localStorage — so a reload mid-demo does not switch the language back under
 * the presenter, and closing the tab forgets it. No copy anywhere claims
 * anything about storage.
 */
function initialLang(): Lang {
  try {
    return sessionStorage.getItem(KEY) === "ar" ? "ar" : "en";
  } catch {
    return "en";
  }
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      sessionStorage.setItem(KEY, lang);
    } catch {
      // Private mode: the toggle still works for this page.
    }
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(
    () => setLangState((prev) => (prev === "ar" ? "en" : "ar")),
    [],
  );
  const t = useCallback(
    (key: keyof typeof ar) => DICTS[lang][key] ?? DICTS.en[key] ?? String(key),
    [lang],
  );

  const value = useMemo<I18n>(
    () => ({ lang, dir, setLang, toggle, t }),
    [lang, dir, setLang, toggle, t],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n used outside LangProvider");
  return ctx;
}

export type TextKey = keyof typeof ar;
