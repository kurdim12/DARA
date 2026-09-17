import file from "../../content/verified.json";
import type { Lang } from "../../shared/types";

/**
 * Phone numbers and legal lines, and who checked them.
 *
 * A number renders only when its entry says `verified: true` — in every build,
 * dev included. Two rules earn the flag: somebody opened the official source,
 * and the row records `value`, `source_url` and `verified_on` so the claim can
 * be re-checked later without repeating the work. An invented emergency number
 * is worse than none, and this audience will ask.
 */
export interface Contact {
  id: string;
  tone: "primary" | "warn" | "danger";
  label: string;
  /** The directorate the line belongs to. One name, wherever it appears. */
  affiliation: string | null;
  /**
   * The number to dial, or null — and null has two causes the screen must not
   * confuse. Either nobody has checked this line yet, or the body genuinely
   * publishes no single national number (see `noSingleNumber`). The first is a
   * gap in our work; the second is a fact about Jordan, and pretending it is a
   * gap invites someone to "fix" it by picking a number.
   */
  number: string | null;
  /**
   * Some lines are a switchboard plus an extension — 196 then 812594. The
   * extension is held apart from the number on purpose: you dial the short
   * code, wait, then dial the extension, so gluing them into one tel: link
   * would dial 196812594, which is not a number anyone answers.
   */
  extensions: string[];
  /** Says that in the reader's language, next to the extension. */
  dialNote: string | null;
  /** True for a line that costs nothing to call. */
  free: boolean;
  email: string | null;
  /** One line: what this number is for. */
  whenToCall: string | null;
  /** A second way in — an app, a form. Never another number. */
  also: string | null;
  /** This body publishes one number per governorate, so no number is THE number. */
  noSingleNumber: boolean;
  /** Why, in the reader's language. Shown where a number would have been. */
  whyNoNumber: string | null;
  /** The id of the contact to call instead, when this one has nothing to dial. */
  routeTo: string | null;
  /** Where to send someone when there is nothing to dial. */
  officialUrl: string | null;
  /** Where the claim came from — shown, so a reader can check it themselves. */
  sourceUrl: string | null;
  /** ISO date. Latin digits, per the RTL rules. */
  verifiedOn: string | null;
}

type Pair = { en: string; ar: string };

interface RawContact {
  id: string;
  tone: Contact["tone"];
  label: Pair;
  affiliation?: Pair;
  number: string | null;
  extensions?: string[];
  dial_note?: Pair;
  free?: boolean;
  email?: string;
  when_to_call?: Pair;
  also?: Pair;
  no_single_number?: boolean;
  why_no_number?: Pair;
  route_to?: string;
  official_url?: string;
  source_url?: string;
  verified_on?: string;
  verified: boolean;
}

interface RawLegal {
  id: string;
  text: Pair;
  verified: boolean;
}

function pick(text: Pair, lang: Lang): string {
  return lang === "ar" ? text.ar : text.en;
}

function maybe(text: Pair | undefined, lang: Lang): string | null {
  return text ? pick(text, lang) : null;
}

export function contacts(lang: Lang): Contact[] {
  return (file.contacts as unknown as RawContact[]).map((entry) => {
    const ok = entry.verified;
    return {
      id: entry.id,
      tone: entry.tone,
      label: pick(entry.label, lang),
      affiliation: maybe(entry.affiliation, lang),
      number: ok ? entry.number : null,
      extensions: ok ? (entry.extensions ?? []) : [],
      dialNote: ok ? maybe(entry.dial_note, lang) : null,
      free: ok ? Boolean(entry.free) : false,
      email: ok ? (entry.email ?? null) : null,
      whenToCall: maybe(entry.when_to_call, lang),
      also: ok ? maybe(entry.also, lang) : null,
      noSingleNumber: Boolean(entry.no_single_number),
      whyNoNumber: maybe(entry.why_no_number, lang),
      routeTo: entry.route_to ?? null,
      officialUrl: ok ? (entry.official_url ?? null) : null,
      sourceUrl: ok ? (entry.source_url ?? null) : null,
      verifiedOn: ok ? (entry.verified_on ?? null) : null,
    };
  });
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
  label: Pair;
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
