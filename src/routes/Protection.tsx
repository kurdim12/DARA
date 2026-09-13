import { BottomNav } from "../components/BottomNav";
import { LangToggle, Page, PrimaryButton } from "../components/Layout";
import { RecoverPaths } from "../components/RecoverPaths";
import { useI18n } from "../i18n";
import type { Route } from "../lib/router";

/**
 * The way in for someone who is past "is this a scam?". Protection is the
 * entrance; Shield is the flow, and its content stays there rather than being
 * repeated here.
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

        <section className="mt-9">
          <h2 className="text-threat">{t("shield.entry")}</h2>
          <p className="mt-1 text-[13px] text-ink-2">{t("shield.entry_sub")}</p>
          <div className="mt-5">
            {/* Red here is a threat action, which is what this is. */}
            <PrimaryButton threat onClick={() => navigate("shield")}>
              {t("protection.shield_cta")}
            </PrimaryButton>
          </div>
        </section>

        <RecoverPaths />
      </Page>
      <BottomNav active="protection" navigate={navigate} />
    </>
  );
}
