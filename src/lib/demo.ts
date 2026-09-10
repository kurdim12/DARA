import type { AnalyzeResponse, Lang } from "../../shared/types";
import cached from "../demo/cached-verdicts.json";

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

/** The staged messages, in the order the demo tray shows them. */
export function stagedMessages(): { id: string; text: string; lang: Lang }[] {
  return FILE.verdicts.map(({ id, text, lang }) => ({ id, text, lang }));
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
