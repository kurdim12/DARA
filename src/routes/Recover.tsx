import { BottomNav } from "../components/BottomNav";
import { LangToggle, Page } from "../components/Layout";
import { LayerSections } from "../components/LayerSections";
import { useI18n } from "../i18n";
import { recoverSections } from "../lib/layers";
import type { Route } from "../lib/router";

/**
 * تعافي — the first hour, ordered by urgency. Reviewed content, no AI, and
 * nothing here names an institution's process unless someone has checked it.
 */
export function Recover({ navigate }: { navigate: (route: Route) => void }) {
  const { t } = useI18n();

  return (
    <>
      <Page withNav>
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => navigate("home")} className="tap text-ink-2">
            {t("shield.back")}
          </button>
          <LangToggle />
        </header>

        <h1 className="mt-6">{t("recover.title")}</h1>
        <p className="mt-2 text-[13px] text-ink-2">{t("recover.subtitle")}</p>

        <LayerSections sections={recoverSections()} />
      </Page>
      <BottomNav active="recover" navigate={navigate} />
    </>
  );
}
