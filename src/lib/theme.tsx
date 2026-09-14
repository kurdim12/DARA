import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
}

const Ctx = createContext<ThemeState | null>(null);

/**
 * The browser chrome. Navy in light because Home's hero runs under the status
 * bar; the dark page ground in dark. Both match src/styles/tokens.css.
 */
const CHROME: Record<Theme, string> = { light: "#0B2A6F", dark: "#0E1220" };

const KEY = "dara.theme";

/**
 * Light by default, as the submitted app opens.
 *
 * The choice is kept for this browsing session only — sessionStorage, not
 * localStorage — so a reload during a demo does not throw the app back to
 * light in front of an audience, and closing the tab forgets it. Nothing in
 * the copy claims anything about storage either way.
 */
function initial(): Theme {
  try {
    return sessionStorage.getItem(KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try {
      sessionStorage.setItem(KEY, theme);
    } catch {
      // Private mode: the toggle still works for this page.
    }
    // The status bar and the address bar follow the page, not the system.
    // index.html ships two media-scoped tags so the very first paint is right
    // before this runs; once someone picks a theme, their choice wins on both.
    document
      .querySelectorAll('meta[name="theme-color"]')
      .forEach((tag) => tag.setAttribute("content", CHROME[theme]));
  }, [theme]);

  const toggle = useCallback(
    () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
    [],
  );

  const value = useMemo<ThemeState>(() => ({ theme, toggle }), [theme, toggle]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeState {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme used outside ThemeProvider");
  return ctx;
}
