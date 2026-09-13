import protect from "../../content/layers/protect.json";
import educate from "../../content/layers/educate.json";
import recover from "../../content/layers/recover.json";

/**
 * The reviewed layers: حماية، توعية، تعافي. Fixed content that a person wrote
 * and checked — deliberately not AI, no forms, no external calls.
 *
 * The rule is the same one the rest of the app follows: anything that is a
 * number, a phone number, a law, a penalty, an institution's name or a
 * procedure at a named office ships `verified: false` and does not reach a
 * production build. In dev it renders with a VERIFY tag so Abdelrahman can see
 * exactly what is waiting on him.
 */
const SHOW_UNVERIFIED = import.meta.env.DEV;

export interface Guidance {
  id: string;
  title: string;
  body: string;
  verified: boolean;
}

export interface Anatomy {
  id: string;
  title: string;
  look: string;
  pressure: string;
  tell: string;
  verified: boolean;
}

function gate<T extends { verified: boolean }>(sections: T[]): T[] {
  return sections.filter((section) => section.verified || SHOW_UNVERIFIED);
}

export function protectSections(): Guidance[] {
  return gate(protect.sections as Guidance[]);
}

export function educateSections(): Anatomy[] {
  return gate(educate.sections as Anatomy[]);
}

export function recoverSections(): Guidance[] {
  return gate(recover.sections as Guidance[]);
}

/** How many sections a production build hides. Used by the dev-only notice. */
export function hiddenCount(): number {
  const all = [
    ...(protect.sections as Guidance[]),
    ...(recover.sections as Guidance[]),
    ...(educate.sections as unknown as Anatomy[]),
  ];
  return all.filter((section) => !section.verified).length;
}
