import { useState } from "react";
import { Mark } from "../components/Mark";
import { BottomNav } from "../components/BottomNav";
import { LangToggle, Page } from "../components/Layout";
import { DemoTray } from "../components/DemoTray";
import { useI18n, type TextKey } from "../i18n";
import { listCases } from "../lib/storage";
import { statusLabel } from "../lib/status";
import { sectionNumeral } from "../lib/numerals";
import type { Route } from "../lib/router";

/**
 * The six layers, as the deck sets them out: a numbered editorial list, not a
 * grid of cards. All six are live now — the last three are reviewed content
 * screens, written and checked by a person, with no AI behind them.
 */
const LAYERS: { route: Route; title: TextKey; sub: TextKey }[] = [
  { route: "detect", title: "layer.detect", sub: "layer.detect_sub" },
  { route: "reports", title: "layer.report", sub: "layer.report_sub" },
  { route: "shield", title: "layer.shield", sub: "layer.shield_sub" },
  { route: "protection", title: "layer.protect", sub: "layer.protect_sub" },
  { route: "educate", title: "layer.educate", sub: "layer.educate_sub" },
  { route: "recover", title: "layer.recover", sub: "layer.recover_sub" },
];

export function Home({
  navigate,
  onStaged,
}: {
  navigate: (route: Route) => void;
  onStaged: (text: string) => void;
}) {
  const { t, lang } = useI18n();
  const [trayOpen, setTrayOpen] = useState(false);
  // Only what this device actually has. No reports means no section at all.
  const [latest] = useState(() => listCases()[0] ?? null);

  return (
    <>
      <Page withNav>
        <header className="flex items-start justify-between">
          <Mark size={76} onLongPress={() => setTrayOpen(true)} />
          <LangToggle />
        </header>

        <p className="mt-6 font-kufi text-[22px] font-semibold leading-snug">
          {t("home.tagline")}
        </p>

        <nav className="mt-10 border-t border-rule">
          {LAYERS.map(({ route, title, sub }, index) => (
            <button
              key={route}
              type="button"
              onClick={() => navigate(route)}
              className="flex w-full items-baseline gap-4 border-b border-rule py-5 text-start"
            >
              <span className="font-kufi text-[13px] text-ink-2">
                <bdi>{sectionNumeral(index + 1, lang)}</bdi>
              </span>
              <span className="flex-1">
                <span className="block font-kufi text-[22px] font-semibold leading-snug">
                  {t(title)}
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-ink-2">
                  {t(sub)}
                </span>
              </span>
            </button>
          ))}
        </nav>

        {latest && (
          <section className="mt-10">
            <h2 className="text-[13px] font-semibold uppercase tracking-widest text-ink-2">
              {t("home.last_report")}
            </h2>
            <p className="mt-2 font-kufi text-[22px] font-bold tracking-tight">
              <bdi>{latest.case_number}</bdi>
            </p>
            {latest.status && (
              <p className="mt-1 text-[13px] text-ink-2">
                {t("status.label")}: {statusLabel(latest.status, t)}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate("reports")}
              className="tap mt-3 border-b border-ink pb-0.5 text-[13px]"
            >
              {t("home.view_reports")}
            </button>
          </section>
        )}

        {trayOpen && (
          <DemoTray
            onClose={() => setTrayOpen(false)}
            onPick={(text) => {
              setTrayOpen(false);
              onStaged(text);
            }}
          />
        )}
      </Page>
      <BottomNav active="home" navigate={navigate} />
    </>
  );
}
