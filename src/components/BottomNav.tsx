import { House, Megaphone, ScanLine, User, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

const TABS: { route: Route; label: TextKey; Icon: LucideIcon }[] = [
  { route: "home", label: "nav.home", Icon: House },
  { route: "scan", label: "nav.scan", Icon: ScanLine },
  { route: "report", label: "nav.report", Icon: Megaphone },
  { route: "recover", label: "nav.recover", Icon: Wrench },
  { route: "shield", label: "nav.shield", Icon: User },
];

/** Five destinations, fixed, safe-area padded. Order mirrors with `dir`. */
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-[30rem]">
        {TABS.map(({ route, label, Icon }) => {
          const current = active === route;
          return (
            <li key={route} className="flex-1">
              <button
                type="button"
                onClick={() => navigate(route)}
                aria-current={current ? "page" : undefined}
                className={`flex h-14 w-full flex-col items-center justify-center gap-1 px-1 ${
                  current ? "text-primary" : "text-text-2"
                }`}
              >
                <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                <span className="text-[11px] leading-none">{t(label)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Height the nav occupies, so a page can keep its last line clear of it. */
/** Nav height, the safe area under it, and 16px of air above it. */
export const NAV_CLEARANCE = "calc(56px + env(safe-area-inset-bottom) + 16px)";
