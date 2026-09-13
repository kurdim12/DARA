import { useI18n } from "../i18n";
import { sectionNumeral } from "../lib/numerals";
import type { Guidance } from "../lib/layers";

/**
 * A reviewed layer, set as the deck sets a list: a numeral, a Kufi title, a
 * short paragraph, a hairline between. No cards, no icons, no colour.
 */
export function LayerSections({ sections }: { sections: Guidance[] }) {
  const { lang } = useI18n();

  return (
    <ol className="mt-8 border-t border-rule">
      {sections.map((section, index) => (
        <li key={section.id} className="flex gap-4 border-b border-rule py-6">
          <span className="font-kufi text-[13px] text-ink-2">
            <bdi>{sectionNumeral(index + 1, lang)}</bdi>
          </span>
          <div className="flex-1">
            <h2 className="text-[22px]">
              {section.title}
              {!section.verified && <VerifyTag />}
            </h2>
            <p dir="auto" className="mt-2 leading-relaxed">
              {section.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/**
 * Only ever reachable in a development build: gate() has already removed every
 * unverified section from a production one.
 */
export function VerifyTag() {
  return (
    <span className="ms-2 border border-threat px-1.5 align-middle font-sans text-xs text-threat">
      VERIFY
    </span>
  );
}
