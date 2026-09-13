import file from "../../content/verified.json";
import type { Lang } from "../../shared/types";

/**
 * Phone numbers and legal lines, and whether anyone has checked them.
 *
 * A number renders only when its entry says `verified: true` — in every build,
 * dev included. Until then the Shield screen shows the card and the name with
 * "number pending verification" in its place, and no tel: link: an invented
 * emergency number is worse than none, and this audience will ask.
 */
export interface Contact {
  id: string;
  tone: "primary" | "warn" | "danger";
  label: string;
  /** null until someone has checked it against an official source. */
  number: string | null;
}

interface RawContact {
  id: string;
  tone: Contact["tone"];
  label: { en: string; ar: string };
  number: string;
  verified: boolean;
}

interface RawLegal {
  id: string;
  text: { en: string; ar: string };
  verified: boolean;
}

function pick(text: { en: string; ar: string }, lang: Lang): string {
  return lang === "ar" ? text.ar : text.en;
}

export function contacts(lang: Lang): Contact[] {
  return (file.contacts as RawContact[]).map((entry) => ({
    id: entry.id,
    tone: entry.tone,
    label: pick(entry.label, lang),
    number: entry.verified ? entry.number : null,
  }));
}

export function contact(id: string, lang: Lang): Contact | null {
  return contacts(lang).find((entry) => entry.id === id) ?? null;
}

/** The cybercrime-law line, or null while nobody has cited the article. */
export function legalLine(id: string, lang: Lang): string | null {
  const entry = (file.legal as RawLegal[]).find((item) => item.id === id);
  if (!entry || !entry.verified) return null;
  return pick(entry.text, lang);
}
