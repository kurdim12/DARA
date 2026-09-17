import type { AnalyzeResponse } from "../../shared/types";

/**
 * A 24-hour cache of identical scans, on D1.
 *
 * The point is the demo: the three staged messages, and anything a presenter
 * checks twice, come back instantly instead of spending six to ten seconds at
 * the gateway again.
 *
 * The raw message is never stored — only a hash of it. The cache therefore
 * cannot be read back into anyone's pasted text, which matters because that
 * text is whatever a stranger sent them.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Same message, same answer. Collapses whitespace and case so a re-paste with
 * a stray newline still hits, and folds in lang and type because they change
 * what the engine is asked. JSON.stringify keeps the three parts unambiguous
 * without needing a separator that could appear in the text.
 */
async function cacheKey(
  text: string,
  lang: string,
  type: string | undefined,
): Promise<string> {
  const normalized = text.replace(/\s+/g, " ").trim().toLowerCase();
  const material = JSON.stringify([lang, type ?? "", normalized]);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * The cached verdict, or null. Never throws: a cache miss and a broken cache
 * have to look the same to the caller, or a bad table takes the scan down.
 */
export async function cachedScan(
  db: D1Database,
  text: string,
  lang: string,
  type: string | undefined,
): Promise<AnalyzeResponse | null> {
  try {
    const key = await cacheKey(text, lang, type);
    const row = await db
      .prepare("SELECT body, created_at FROM scan_cache WHERE key = ?")
      .bind(key)
      .first<{ body: string; created_at: number }>();
    if (!row) return null;
    if (Date.now() - row.created_at > DAY_MS) return null;
    return JSON.parse(row.body) as AnalyzeResponse;
  } catch {
    return null;
  }
}

/**
 * Store a verdict. Never throws, and never stores a preliminary one — a
 * degraded answer must not keep being served for 24 hours after the outage
 * that caused it has ended.
 */
export async function storeScan(
  db: D1Database,
  text: string,
  lang: string,
  type: string | undefined,
  body: AnalyzeResponse,
): Promise<void> {
  if (body.preliminary) return;
  try {
    const key = await cacheKey(text, lang, type);
    await db
      .prepare("INSERT OR REPLACE INTO scan_cache (key, body, created_at) VALUES (?, ?, ?)")
      .bind(key, JSON.stringify(body), Date.now())
      .run();
  } catch {
    // A cache that cannot write is not a failed scan.
  }
}
