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
const STORAGE_KEY = "dara.lang";

interface I18n {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (lang: Lang) => void;
  toggle: () => void;
  t: (key: keyof typeof ar) => string;
}

const Ctx = createContext<I18n | null>(null);

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "ar" || stored === "en") return stored;
  } catch {
    // Private mode or storage disabled: Arabic is the default anyway.
  }
  return "ar";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // Not worth interrupting anyone over.
    }
  }, [lang, dir]);

  const setLang = useCallback((next: Lang) => setLangState(next), []);
  const toggle = useCallback(
    () => setLangState((prev) => (prev === "ar" ? "en" : "ar")),
    [],
  );
  const t = useCallback(
    (key: keyof typeof ar) => DICTS[lang][key] ?? DICTS.ar[key] ?? String(key),
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
