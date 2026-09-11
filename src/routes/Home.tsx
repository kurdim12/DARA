import { useState } from "react";
import { Mark } from "../components/Mark";
import { LangToggle, Page, PrimaryButton } from "../components/Layout";
import { DemoTray } from "../components/DemoTray";
import { useI18n } from "../i18n";
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

  return (
    <Page>
      <header className="flex justify-end">
        <LangToggle />
      </header>

      <div className="flex flex-col items-center pt-12 text-center">
        <Mark size={148} onLongPress={() => setTrayOpen(true)} />
        <p className="mt-8 max-w-[22rem] text-2xl leading-snug">{t("home.line")}</p>
      </div>

      <div className="mt-11">
        <PrimaryButton onClick={() => navigate("detect")}>
          {t("home.check")}
        </PrimaryButton>
        {/* What "a digital threat" means here, said once and quietly. Not a
            feature list, not cards — one line of secondary type. */}
        <p className="mt-3 text-center text-sm text-ink-55">{t("home.scope")}</p>
      </div>

      <button
        type="button"
        onClick={() => navigate("shield")}
        className="mt-9 block w-full border-2 border-threat px-5 py-4 text-start"
      >
        <span className="block text-xl font-semibold text-threat">
          {t("shield.entry")}
        </span>
        <span className="mt-1 block text-base text-ink-70">{t("shield.entry_sub")}</span>
      </button>

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
  );
}
