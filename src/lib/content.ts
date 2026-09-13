import v1 from "../../content/v1-content.json";
import type { Lang } from "../../shared/types";

/**
 * Content ported from v1. Nothing marked `verified: false` may render in a
 * production build — every phone number, law and statistic in v1 is
 * unconfirmed, and a government jury will ask. In dev they render with a
 * VERIFY tag so Abdelrahman can see what is waiting on him.
 */
const SHOW_UNVERIFIED = import.meta.env.DEV;

interface Bilingual {
  ar: string;
  en: string | null;
}

interface Contact {
  id: string;
  label: Bilingual;
  number: string;
  verified: boolean;
}

export interface ResolvedContact {
  id: string;
  label: string;
  /** null when the contact has not been verified in a production build. */
  number: string | null;
  needsVerification: boolean;
}

const contacts = v1.contacts as unknown as Contact[];
const shield = v1.shield;

export function pick(text: Bilingual, lang: Lang): string {
  return (lang === "en" ? text.en : text.ar) ?? text.ar;
}

export function resolveContact(id: string, lang: Lang): ResolvedContact | null {
  const found = contacts.find((c) => c.id === id);
  if (!found) return null;
  // An unverified number hides its label too. Rendering "الطوارئ" with nothing
  // after it reads as a broken screen, and it happens in the one branch of the
  // app where someone has just said they are in immediate danger.
  if (!found.verified && !SHOW_UNVERIFIED) return null;
  return {
    id: found.id,
    label: pick(found.label, lang),
    number: found.verified || SHOW_UNVERIFIED ? found.number : null,
    needsVerification: !found.verified,
  };
}

export const shieldContent = {
  intro: (lang: Lang) => pick(shield.intro as Bilingual, lang),
  question: (lang: Lang) => pick(shield.danger_check.question as Bilingual, lang),
  ifYes: (lang: Lang) => pick(shield.danger_check.if_yes as Bilingual, lang),
  yesContacts: shield.danger_check.if_yes.contacts as string[],
  ifSafeNow: (lang: Lang) =>
    (shield.danger_check.if_safe_now as Bilingual[]).map((item) => pick(item, lang)),
  steps: (lang: Lang) =>
    (shield.steps as unknown as (Bilingual & { id: string })[]).map((step) => ({
      id: step.id,
      text: pick(step, lang),
    })),
  reassurance: (lang: Lang) => pick(shield.reassurance as Bilingual, lang),
  /**
   * A statement about Jordanian law, so it is gated like every other law in
   * the content file: null until someone has checked the official text.
   */
  legalNote: (lang: Lang): string | null => {
    const note = shield.legal_note as unknown as Bilingual & { verified: boolean };
    if (!note.verified && !SHOW_UNVERIFIED) return null;
    return pick(note, lang);
  },
  legalNoteNeedsVerification: !(shield.legal_note as unknown as { verified: boolean }).verified,
};
