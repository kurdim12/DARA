import { BottomNav } from "../components/BottomNav";
import { LangToggle, Page } from "../components/Layout";
import { VerifyTag } from "../components/LayerSections";
import { useI18n } from "../i18n";
import { educateSections } from "../lib/layers";
import { sectionNumeral } from "../lib/numerals";
import type { Route } from "../lib/router";

/**
 * توعية — the recurring scam families, one anatomy each: how the message
 * looks, the pressure it leans on, and the tell. Reviewed content, no AI.
 */
export function Educate({ navigate }: { navigate: (route: Route) => void }) {
  const { t, lang } = useI18n();
  const sections = educateSections();

  return (
    <>
      <Page withNav>
        <header className="flex items-center justify-between">
          <button type="button" onClick={() => navigate("home")} className="tap text-ink-2">
            {t("shield.back")}
          </button>
          <LangToggle />
        </header>

        <h1 className="mt-6">{t("educate.title")}</h1>
        <p className="mt-2 text-[13px] text-ink-2">{t("educate.subtitle")}</p>

        <ol className="mt-8 border-t border-rule">
          {sections.map((section, index) => (
            <li key={section.id} className="border-b border-rule py-6">
              <div className="flex gap-4">
                <span className="font-kufi text-[13px] text-ink-2">
                  <bdi>{sectionNumeral(index + 1, lang)}</bdi>
                </span>
                <div className="flex-1">
                  <h2 className="text-[22px]">
                    {section.title}
                    {!section.verified && <VerifyTag />}
                  </h2>

                  <dl className="mt-3 space-y-3">
                    <Row label={t("educate.look")} value={section.look} />
                    <Row label={t("educate.pressure")} value={section.pressure} />
                    <Row label={t("educate.tell")} value={section.tell} />
                  </dl>

                  <button
                    type="button"
                    onClick={() => navigate("detect")}
                    className="tap mt-4 border-b border-ink pb-0.5 text-[13px]"
                  >
                    {t("educate.try")}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Page>
      <BottomNav active="educate" navigate={navigate} />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[13px] font-semibold uppercase tracking-widest text-ink-2">
        {label}
      </dt>
      <dd dir="auto" className="mt-1 leading-relaxed">
        {value}
      </dd>
    </div>
  );
}
