import { House, ScanLine, Send, User, Wrench } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

/**
 * Home · Report · Scan · Recover · Shield. Scan sits in the middle because it
 * is what the app is for, and it is raised out of the bar so a thumb finds it
 * without looking. The order mirrors in RTL on its own — this is a flex row.
 */
const TABS: { route: Route; label: TextKey; Icon: LucideIcon }[] = [
  { route: "home", label: "nav.home", Icon: House },
  { route: "report", label: "nav.report", Icon: Send },
  { route: "scan", label: "nav.scan", Icon: ScanLine },
  { route: "recover", label: "nav.recover", Icon: Wrench },
  { route: "shield", label: "nav.shield", Icon: User },
];

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
      <ul
        className="mx-auto flex w-full max-w-[30rem]"
        style={{ height: "var(--nav-inner)" }}
      >
        {TABS.map(({ route, label, Icon }) => {
          const current = active === route;
          const raised = route === "scan";

          return (
            <li key={route} className="relative flex-1">
              <button
                type="button"
                onClick={() => navigate(route)}
                aria-current={current ? "page" : undefined}
                className={`flex size-full flex-col items-center justify-center gap-1 px-1 ${
                  current ? "text-blue" : "text-slate"
                }`}
              >
                {raised ? (
                  // A spacer the size of the icon it replaces, so the label
                  // lands where every other label lands however tall the bar
                  // ends up on a given phone. The circle itself is positioned
                  // against the bar's top edge.
                  <>
                    <span aria-hidden="true" className="block h-[22px] w-[22px]" />
                    <span
                      aria-hidden="true"
                      className="lift absolute left-1/2 flex items-center justify-center rounded-full bg-navy text-white"
                      style={{
                        top: "calc(var(--scan-lift) * -1)",
                        width: "var(--scan-size)",
                        height: "var(--scan-size)",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <Icon size={26} strokeWidth={1.9} />
                    </span>
                  </>
                ) : (
                  <Icon size={22} strokeWidth={1.9} aria-hidden="true" />
                )}
                <span className="text-[11px] font-semibold leading-none">{t(label)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
