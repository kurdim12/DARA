import file from "../../content/community-seed.json";
import type { Lang } from "../../shared/types";

/**
 * The seeded community reports, in the reader's language.
 *
 * A report's `description` is one database column, and a real anonymous report
 * holds whatever the person actually wrote — so it cannot carry two languages
 * and must never be rewritten. A seed is different: it is content this team
 * authored, so the row carries a `seed_key` and the words live here.
 *
 * Returns null for anything that is not a known seed, which is the signal to
 * render the row's own description instead.
 */
interface RawSeed {
  key: string;
  threat_type: string;
  description: { en: string; ar: string };
}

const BY_KEY = new Map(
  (file.reports as RawSeed[]).map((seed) => [seed.key, seed] as const),
);

export function seedText(key: string | null | undefined, lang: Lang): string | null {
  if (!key) return null;
  const seed = BY_KEY.get(key);
  if (!seed) return null;
  return lang === "ar" ? seed.description.ar : seed.description.en;
}

/** Every seed key the content file defines, for the migration's own test. */
export function seedKeys(): string[] {
  return [...BY_KEY.keys()];
}
