import type { Lang } from "../../shared/types";

/**
 * Date and time formatting locales.
 *
 * The Arabic one carries `-u-nu-latn` on purpose: without it the platform
 * formats an ar-JO date in Arabic-Indic digits (٢٧ آب ٢٠٢٦), and this app uses
 * Latin digits everywhere so a case number, a date and a statistic are read the
 * same way by an Arabic and an English reader — and by a judge holding the
 * phone sideways.
 */
export const DATE_LOCALE: Record<Lang, string> = {
  ar: "ar-JO-u-nu-latn",
  en: "en-GB",
};

export function dateLocale(lang: Lang): string {
  return DATE_LOCALE[lang] ?? DATE_LOCALE.en;
}
