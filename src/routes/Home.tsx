import { useState } from "react";
import { Mark } from "../components/Mark";
import { BottomNav } from "../components/BottomNav";
import { LangToggle, Page } from "../components/Layout";
import { DemoTray } from "../components/DemoTray";
import { useI18n } from "../i18n";
import { listCases } from "../lib/storage";
import { statusLabel } from "../lib/status";
import type { Route } from "../lib/router";

export function Home({
  navigate,
  onStaged,
}: {
  navigate: (route: Route) => void;
  onStaged: (text: string) => void;
}) {
  const { t } = useI18n();
  const [trayOpen, setTrayOpen] = useState(false);
  // Only what this device actually has. No reports means no section at all.
  const [latest] = useState(() => listCases()[0] ?? null);

  return (
    <>
      <Page withNav>
        <header className="flex justify-end">
          <LangToggle />
        </header>

        <div className="my-auto">
        <div className="flex flex-col items-center pt-6 text-center">
          <Mark size={112} onLongPress={() => setTrayOpen(true)} />
          <p className="mt-7 max-w-[20rem] text-2xl leading-snug">{t("home.statement")}</p>
        </div>

        <button
          type="button"
          onClick={() => navigate("detect")}
          className="mt-10 block w-full bg-ink px-5 py-5 text-start text-paper"
        >
          <span className="block text-xl font-semibold">{t("home.action_check")}</span>
          <span className="mt-1 block text-base opacity-80">
            {t("home.action_check_sub")}
          </span>
        </button>

        <button
          type="button"
          onClick={() => navigate("protection")}
          className="mt-4 block w-full border border-ink-20 px-5 py-5 text-start"
        >
          <span className="block text-xl font-semibold text-ink">
            {t("home.action_protection")}
          </span>
          <span className="mt-1 block text-base text-ink-70">
            {t("home.action_protection_sub")}
          </span>
        </button>

        {latest && (
          <section className="mt-10 border-t border-ink-12 pt-5">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-55">
              {t("home.last_report")}
            </h2>
            <p className="mt-2 text-xl font-bold tracking-tight">
              <bdi>{latest.case_number}</bdi>
            </p>
            {latest.status && (
              <p className="mt-1 text-base text-ink-70">
                {t("status.label")}: {statusLabel(latest.status, t)}
              </p>
            )}
            <button
              type="button"
              onClick={() => navigate("reports")}
              className="mt-3 border-b border-ink pb-0.5 text-base"
            >
              {t("home.view_reports")}
            </button>
          </section>
        )}
        </div>

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
