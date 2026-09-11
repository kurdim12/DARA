import type { AnalyzeResponse, Lang } from "../../shared/types";
import cached from "../demo/cached-verdicts.json";
import staged from "../demo/staged.json";

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

/**
 * The staged messages, written from the golden set by `npm run demo:stage` —
 * not read from the saved verdicts, because the tray has to work before
 * `npm run cache-demo` has ever run. Importing the golden set directly would
 * ship every case and its expected verdict to the client.
 */
export function stagedMessages(): { id: string; text: string; lang: Lang }[] {
  return staged as { id: string; text: string; lang: Lang }[];
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
