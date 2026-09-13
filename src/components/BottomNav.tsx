import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

const TABS: { route: Extract<Route, "home" | "detect" | "reports" | "protection">; label: TextKey }[] = [
  { route: "home", label: "nav.home" },
  { route: "detect", label: "nav.detect" },
  { route: "reports", label: "nav.reports" },
  { route: "protection", label: "nav.protection" },
];

/**
 * The app's permanent structure: four destinations, words only. No icons to
 * decode, no colour to misread — red means threat everywhere else in DARA',
 * so it cannot mean "you are here".
 */
export function BottomNav({
  active,
  navigate,
}: {
  active: Route;
  navigate: (route: Route) => void;
}) {
  const { t } = useI18n();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ink-20 bg-paper"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-[46rem]">
        {TABS.map(({ route, label }) => {
          const current = active === route;
          return (
            <li key={route} className="flex-1">
              <button
                type="button"
                onClick={() => navigate(route)}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-11 w-full flex-col items-center justify-center gap-1.5 px-1 pb-2.5 pt-2 text-sm ${
                  current ? "font-semibold text-ink" : "text-ink-55"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`h-0.5 w-6 ${current ? "bg-ink" : "bg-transparent"}`}
                />
                <span className="leading-none">{t(label)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Height the nav occupies, so a page can keep its last line clear of it. */
export const NAV_CLEARANCE = "calc(4.5rem + env(safe-area-inset-bottom))";
