import type { AnalysisType } from "../../shared/types";

/**
 * Guess what someone just pasted, so the chip is already right and they do not
 * have to classify their own problem before asking about it.
 *
 * A guess only: the chips stay tappable and whatever is selected is what goes
 * to the analyzer. Nothing here inspects a link or fetches anything — it reads
 * the shape of the string and stops.
 */

/** A URL with a scheme, or a bare host with a dot and no spaces. */
const WITH_SCHEME = /^(https?:\/\/|www\.)\S+$/i;
const BARE_HOST = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)+(?:\/\S*)?$/i;

/**
 * Jordanian and international shapes: an optional +, then 7-15 digits, with
 * spaces, dashes, dots or parens allowed between them. Arabic-Indic digits
 * count — someone pasting from an Arabic keyboard is pasting a phone number.
 */
const ARABIC_DIGITS = /[٠-٩۰-۹]/g;
const PHONE_SHAPE = /^\+?[\d\s\-().]{7,22}$/;

const toLatinDigits = (value: string) =>
  value.replace(ARABIC_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    const base = code >= 0x06f0 ? 0x06f0 : 0x0660;
    return String(code - base);
  });

/**
 * The type a pasted string looks like, or null when it looks like prose —
 * which is most messages, and the case where guessing would be worse than
 * leaving the chip alone.
 */
export function detectType(raw: string): AnalysisType | null {
  const value = raw.trim();
  if (!value) return null;

  // A link has to be the WHOLE input. A sentence that happens to contain one
  // is a message about a link, and the message is the thing worth reading.
  if (!/\s/.test(value) && (WITH_SCHEME.test(value) || BARE_HOST.test(value))) return "link";

  // A phone number is written with spaces — "+962 79 123 4567" is the normal
  // way, not the exception — so the whole-string match does the work here
  // instead of a no-whitespace rule.
  const digits = toLatinDigits(value);
  if (PHONE_SHAPE.test(digits) && (digits.match(/\d/g)?.length ?? 0) >= 7) return "call";

  return null;
}
