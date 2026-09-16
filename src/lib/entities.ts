import file from "../../content/entities.json";
import type { Lang } from "../../shared/types";

/**
 * The official entities directory: who a scam impersonates, the body's real
 * domain, and the one thing that body never does.
 *
 * An entry renders only while `verified` is true. The domain is what a lookup
 * compares against, and it is not a claim that the body endorses DARA'.
 */
export interface Entity {
  id: string;
  tone: "red" | "amber" | "teal" | "violet";
  name: string;
  domain: string;
  never: string;
}

interface Raw {
  id: string;
  tone: Entity["tone"];
  name_ar: string;
  name_en: string;
  domain: string;
  never_ar: string;
  never_en: string;
  verified: boolean;
}

function pick(ar: string | undefined, en: string | undefined, lang: Lang): string {
  const wanted = lang === "ar" ? ar : en;
  return (wanted && wanted.trim()) || (lang === "ar" ? en : ar) || "";
}

export function entities(lang: Lang): Entity[] {
  return (file.entries as Raw[])
    .filter((entry) => entry.verified === true)
    .map((entry) => ({
      id: entry.id,
      tone: entry.tone,
      name: pick(entry.name_ar, entry.name_en, lang),
      domain: entry.domain,
      never: pick(entry.never_ar, entry.never_en, lang),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, lang === "ar" ? "ar" : "en"));
}

/** Free-text search over the name and the domain. */
export function searchEntities(list: Entity[], query: string): Entity[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return list;
  return list.filter(
    (entry) =>
      entry.name.toLowerCase().includes(needle) || entry.domain.toLowerCase().includes(needle),
  );
}
