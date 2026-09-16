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
  /**
   * Some lines are a switchboard plus an extension — 196 then 812594. The
   * extension is held apart from the number on purpose: you dial the short
   * code, wait, then dial the extension, so gluing them into one tel: link
   * would dial 196812594, which is not a number anyone answers.
   */
  extensions: string[];
}

interface RawContact {
  id: string;
  tone: Contact["tone"];
  label: { en: string; ar: string };
  number: string;
  extensions?: string[];
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
    extensions: entry.verified ? (entry.extensions ?? []) : [],
  }));
}

export function contact(id: string, lang: Lang): Contact | null {
  return contacts(lang).find((entry) => entry.id === id) ?? null;
}

export interface VerifiedLink {
  id: string;
  label: string;
  url: string;
}

interface RawLink {
  id: string;
  label: { en: string; ar: string };
  url: string;
  verified: boolean;
}

/**
 * An outbound link to an official form, or null while nobody has opened it.
 * A URL the app sends someone to is the same kind of claim as a phone number.
 */
export function officialLink(id: string, lang: Lang): VerifiedLink | null {
  const entry = ((file as { links?: RawLink[] }).links ?? []).find((item) => item.id === id);
  if (!entry || !entry.verified) return null;
  return { id: entry.id, label: pick(entry.label, lang), url: entry.url };
}

/** The cybercrime-law line, or null while nobody has cited the article. */
export function legalLine(id: string, lang: Lang): string | null {
  const entry = (file.legal as RawLegal[]).find((item) => item.id === id);
  if (!entry || !entry.verified) return null;
  return pick(entry.text, lang);
}
