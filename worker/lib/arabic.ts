/**
 * Tolerant text matching for red-flag quotes.
 *
 * The engine is told to copy quotes character for character, but models drop a
 * tatweel or a diacritic, or re-space a line. A quote that is really in the
 * message should still highlight, so matching ignores what a reader would not
 * notice — while the offsets it returns always point into the original text.
 */

const DIACRITIC_RANGES: [number, number][] = [
  [0x0610, 0x061a], // Arabic honorifics
  [0x064b, 0x065f], // harakat
  [0x0670, 0x0670], // superscript alef
  [0x06d6, 0x06dc],
  [0x06df, 0x06e8],
  [0x06ea, 0x06ed],
];

const IGNORED_CHARS = new Set([
  0x0640, // tatweel
  0x200b,
  0x200c,
  0x200d,
  0x200e,
  0x200f, // zero-width and bidi marks
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e,
  0x2066,
  0x2067,
  0x2068,
  0x2069,
  0xfeff,
]);

function isIgnored(code: number): boolean {
  if (IGNORED_CHARS.has(code)) return true;
  for (const [lo, hi] of DIACRITIC_RANGES) {
    if (code >= lo && code <= hi) return true;
  }
  return false;
}

/** Arabic-Indic and Eastern Arabic-Indic digits fold onto Latin digits. */
function foldDigit(code: number): string | null {
  if (code >= 0x0660 && code <= 0x0669) return String(code - 0x0660);
  if (code >= 0x06f0 && code <= 0x06f9) return String(code - 0x06f0);
  return null;
}

export interface NormalizedText {
  normalized: string;
  /** map[i] is the index in the original string of normalized[i]. */
  map: number[];
}

/**
 * Folds diacritics, tatweel, bidi marks, digit forms and whitespace runs,
 * keeping a code-unit map back to the original string.
 */
export function normalizeWithMap(input: string): NormalizedText {
  const out: string[] = [];
  const map: number[] = [];
  let pendingSpace = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!;
    const code = ch.charCodeAt(0);

    if (isIgnored(code)) continue;

    if (/\s/.test(ch)) {
      // Collapse any run of whitespace to one space, but never lead with one.
      if (out.length > 0) pendingSpace = true;
      continue;
    }

    if (pendingSpace) {
      out.push(" ");
      map.push(i);
      pendingSpace = false;
    }

    const digit = foldDigit(code);
    if (digit !== null) {
      out.push(digit);
      map.push(i);
      continue;
    }

    // Lowercase only when it stays one code unit, so the map stays 1:1.
    const lower = ch.toLowerCase();
    out.push(lower.length === 1 ? lower : ch);
    map.push(i);
  }

  return { normalized: out.join(""), map };
}

export function normalize(input: string): string {
  return normalizeWithMap(input).normalized;
}

export interface Span {
  start: number;
  end: number;
}

/**
 * Finds `quote` inside `original` and returns offsets into the original text.
 * Returns null when the quote is not really there — the caller drops the flag.
 */
export function findQuoteSpan(original: string, quote: string): Span | null {
  const needle = normalize(quote).trim();
  if (needle.length === 0) return null;

  const haystack = normalizeWithMap(original);
  const at = haystack.normalized.indexOf(needle);
  if (at === -1) return null;

  const start = haystack.map[at]!;
  const lastIndex = haystack.map[at + needle.length - 1]!;
  return { start, end: lastIndex + 1 };
}
