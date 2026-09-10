import type { AnalyzeResponse, Lang } from "../../shared/types";
import cached from "../demo/cached-verdicts.json";
import evalCases from "../../content/eval-cases.json";

interface CachedEntry {
  id: string;
  lang: Lang;
  text: string;
  response: AnalyzeResponse;
}

interface CachedFile {
  _meta: { generated_at: string | null; model: string | null; note?: string };
  verdicts: CachedEntry[];
}

const FILE = cached as unknown as CachedFile;

export const cacheMeta = FILE._meta;

const PLACEHOLDER = "REPLACE_WITH_EXACT_SMS_TEXT";

interface EvalCase {
  id: string;
  demo?: boolean;
  lang: Lang;
  text: string;
}

/**
 * The staged messages come from the golden set, not from the saved verdicts —
 * the tray has to work before `npm run cache-demo` has ever run. A case whose
 * text is still the placeholder is left out: there is nothing to analyze.
 */
export function stagedMessages(): { id: string; text: string; lang: Lang }[] {
  return (evalCases.cases as EvalCase[])
    .filter((entry) => entry.demo === true && entry.text !== PLACEHOLDER)
    .map(({ id, text, lang }) => ({ id, text, lang }));
}

/** True once a staged message has a recorded verdict to fall back on. */
export function hasCachedVerdict(id: string): boolean {
  return FILE.verdicts.some((entry) => entry.id === id);
}

/**
 * A saved verdict is only ever returned for a staged message, matched exactly
 * on the text and the language. Any other input has no fallback at all.
 */
export function cachedVerdictFor(text: string, lang: Lang): AnalyzeResponse | null {
  const needle = text.trim();
  const hit = FILE.verdicts.find(
    (entry) => entry.text.trim() === needle && entry.lang === lang,
  );
  if (!hit) return null;
  return { ...hit.response, cached: true };
}
