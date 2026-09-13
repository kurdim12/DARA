import { BottomNav } from "../components/BottomNav";
import { LangToggle, Page, PrimaryButton } from "../components/Layout";
import { LayerSections } from "../components/LayerSections";
import { useI18n } from "../i18n";
import { protectSections } from "../lib/layers";
import type { Route } from "../lib/router";

/**
 * حماية — what a person can do in the next ten minutes. The urgent path out
 * of here sits at the top, because someone being threatened right now should
 * not have to read a checklist first.
 */
export function Protection({ navigate }: { navigate: (route: Route) => void }) {
  const { t } = useI18n();

  return (
    <>
      <Page withNav>
        <header className="flex justify-end">
          <LangToggle />
        </header>

        <h1 className="mt-6">{t("protection.title")}</h1>
        <p className="mt-2 text-[13px] text-ink-2">{t("protection.subtitle")}</p>

        <section className="mt-8 bg-paper-2 px-4 py-5">
          <h2 className="text-threat">{t("shield.entry")}</h2>
          <p className="mt-1 text-[13px] text-ink-2">{t("shield.entry_sub")}</p>
          <div className="mt-4">
            {/* Red here is the Shield layer's own accent, which is what this is. */}
            <PrimaryButton threat onClick={() => navigate("shield")}>
              {t("protection.shield_cta")}
            </PrimaryButton>
          </div>
        </section>

        <h2 className="mt-11">{t("protection.layer_title")}</h2>
        <LayerSections sections={protectSections()} />
      </Page>
      <BottomNav active="protection" navigate={navigate} />
    </>
  );
}
