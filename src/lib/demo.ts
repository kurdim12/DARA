import type { AnalyzeResponse, Lang } from "../../shared/types";
import cached from "../demo/cached-verdicts.json";
import staged from "../demo/staged.json";

/**
 * Verdicts this device has already seen the live engine give for a staged
 * message. `npm run cache-demo` writes the file above from a machine with
 * network; this is the same thing earned by running the message once on the
 * phone that will be on stage. Both are real engine output — neither is
 * written by hand, and a saved result is always tagged "نتيجة محفوظة".
 */
const SEEN_KEY = "dara.seenVerdicts";

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

type SeenMap = Record<string, AnalyzeResponse>;

function readSeen(): SeenMap {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as SeenMap) : {};
  } catch {
    return {};
  }
}

/** The key is the staged message itself, so nothing else can ever match. */
function seenKey(text: string, lang: Lang): string | null {
  const needle = text.trim();
  const hit = stagedMessages().find((item) => item.text.trim() === needle && item.lang === lang);
  return hit ? `${hit.id}:${lang}` : null;
}

/**
 * Remembers a live verdict, but only for a staged message. Anything a person
 * actually pastes is never written to this device.
 */
export function rememberVerdict(text: string, lang: Lang, response: AnalyzeResponse): void {
  const key = seenKey(text, lang);
  if (!key) return;
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify({ ...readSeen(), [key]: response }));
  } catch {
    // Storage can be unavailable. The live result is still on screen.
  }
}

/** True once a staged message has a recorded verdict to fall back on. */
export function hasCachedVerdict(id: string): boolean {
  if (FILE.verdicts.some((entry) => entry.id === id)) return true;
  const seen = readSeen();
  return Object.keys(seen).some((key) => key.split(":")[0] === id);
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
  if (hit) return { ...hit.response, cached: true };

  const key = seenKey(text, lang);
  const seen = key ? readSeen()[key] : undefined;
  return seen ? { ...seen, cached: true } : null;
}
