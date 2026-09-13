import type { Lang } from "../../shared/types";

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

/**
 * Arabic-Indic digits, for section numerals only — the ٠١ … ٠٦ down the side
 * of a list, and the step numbers in Shield.
 *
 * Everything else stays Western on purpose: a case number is read aloud and
 * typed back, a percentage is compared against what someone else says, a date
 * is matched against a bank's SMS. Those are not decoration.
 */
export function sectionNumeral(value: number, lang: Lang): string {
  const western = String(value).padStart(2, "0");
  if (lang !== "ar") return western;
  return western.replace(/\d/g, (digit) => ARABIC_INDIC[Number(digit)]);
}

/** The same digits without the leading zero, for an inline step number. */
export function stepNumeral(value: number, lang: Lang): string {
  const western = String(value);
  if (lang !== "ar") return western;
  return western.replace(/\d/g, (digit) => ARABIC_INDIC[Number(digit)]);
}
