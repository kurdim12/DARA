import { House, LifeBuoy, Radar, ScanLine, Send } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

/**
 * الرئيسية · فحص · بلاغاتي · الرادار · تعافي.
 *
 * Scan is raised out of the bar in the brand red — 58px, lifted 30px — because
 * it is what the app is for and a thumb should find it without looking.
 *
 * It is NOT centred, and that is the brief's own conflict rather than a slip:
 * the tab order it gives puts فحص second of five, while the same paragraph
 * calls it "the raised centre button". Slot two is what the ordered list says,
 * so that is what this renders; moving it to slot three would centre it and
 * reorder the list. Flagged at the Phase 1 gate rather than decided here.
 *
 * بلاغاتي holds the report form and the case numbers this device has sent.
 * تعافي holds the recovery steps, درع الابتزاز and the verified numbers. The
 * row mirrors in RTL on its own — it is a flex row.
 */
const TABS: { route: Route; label: TextKey; Icon: LucideIcon }[] = [
  { route: "home", label: "nav.home", Icon: House },
  { route: "scan", label: "nav.scan", Icon: ScanLine },
  { route: "report", label: "nav.report", Icon: Send },
  { route: "radar", label: "nav.radar", Icon: Radar },
  { route: "help", label: "nav.help", Icon: LifeBuoy },
];

/** Screens that are not tabs still light the tab they belong under. */
const BELONGS_TO: Partial<Record<Route, Route>> = {
  threats: "radar",
  recover: "help",
  shield: "help",
  protect: "home",
  learn: "home",
};

export function BottomNav({
  active,
  navigate,
}: {
  active: Route;
  navigate: (route: Route) => void;
}) {
  const { t } = useI18n();
  const current = BELONGS_TO[active] ?? active;

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
          const on = current === route;
          const raised = route === "scan";

          return (
            <li key={route} className="relative flex-1">
              <button
                type="button"
                onClick={() => navigate(route)}
                aria-current={on ? "page" : undefined}
                className={`flex size-full flex-col items-center justify-center gap-1 px-1 ${
                  on ? "text-ink" : "text-ink-2"
                }`}
              >
                {raised ? (
                  // A spacer the size of the icon it replaces, so the label
                  // lands where every other label lands however tall the bar
                  // ends up on a given phone. The circle is positioned against
                  // the bar's top edge.
                  <>
                    <span aria-hidden="true" className="block size-[22px]" />
                    <span
                      aria-hidden="true"
                      className="lift absolute left-1/2 flex items-center justify-center rounded-full bg-red text-white-brush"
                      style={{
                        top: "calc(var(--scan-lift) * -1)",
                        width: "var(--scan-size)",
                        height: "var(--scan-size)",
                        transform: "translateX(-50%)",
                      }}
                    >
                      <Icon size={26} strokeWidth={1.75} />
                    </span>
                  </>
                ) : (
                  <Icon size={22} strokeWidth={1.75} aria-hidden="true" />
                )}
                <span className={`text-[11px] leading-none ${on ? "font-bold" : "font-medium"}`}>
                  {t(label)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
