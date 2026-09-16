import accountHacked from "../../content/recover/account_hacked.json";
import linkTapped from "../../content/recover/link_tapped.json";
import dataStolen from "../../content/recover/data_stolen.json";
import deviceCompromised from "../../content/recover/device_compromised.json";
import identityTheft from "../../content/recover/identity_theft.json";
import moneyLost from "../../content/recover/money_lost.json";
import protectFile from "../../content/protect.json";
import quizFile from "../../content/quiz.json";
import type { Lang } from "../../shared/types";

interface Bilingual {
  en: string;
  ar: string;
}

function pick(text: Bilingual, lang: Lang): string {
  return lang === "ar" ? text.ar : text.en;
}

/* ---------------------------------------------------------------- Recover */

export type PlanId =
  | "money_lost"
  | "data_stolen"
  | "link_tapped"
  | "account_hacked"
  | "device_compromised"
  | "identity_theft";

interface RawStep {
  id: string;
  title: Bilingual;
  body: Bilingual;
  verified: boolean;
}

interface RawPlan {
  title: Bilingual;
  summary: Bilingual;
  steps: RawStep[];
}

/**
 * Order matters: losing money is the one where minutes count, and the list
 * runs from most urgent to least. The sixth entry on the Recover screen is not
 * a plan at all — being blackmailed opens the shield, which is a different
 * kind of screen with a quick exit on it.
 */
const PLAN_FILES: Record<PlanId, RawPlan> = {
  money_lost: moneyLost as RawPlan,
  data_stolen: dataStolen as RawPlan,
  link_tapped: linkTapped as RawPlan,
  account_hacked: accountHacked as RawPlan,
  device_compromised: deviceCompromised as RawPlan,
  identity_theft: identityTheft as RawPlan,
};

export interface Plan {
  id: PlanId;
  title: string;
  summary: string;
  steps: { id: string; title: string; body: string }[];
}

/**
 * A step that names an institution's procedure or a number ships
 * `verified: false` and does not render in production, the same rule the rest
 * of the app follows.
 */
const SHOW_UNVERIFIED = import.meta.env.DEV;

export function plans(lang: Lang): Plan[] {
  return (Object.keys(PLAN_FILES) as PlanId[]).map((id) => {
    const raw = PLAN_FILES[id];
    return {
      id,
      title: pick(raw.title, lang),
      summary: pick(raw.summary, lang),
      steps: raw.steps
        .filter((step) => step.verified || SHOW_UNVERIFIED)
        .map((step) => ({
          id: step.id,
          title: pick(step.title, lang),
          body: pick(step.body, lang),
        })),
    };
  });
}

/* ---------------------------------------------------------------- Protect */

export interface ChecklistItem {
  id: string;
  title: string;
  body: string;
}

export function checklist(lang: Lang): ChecklistItem[] {
  return (protectFile.items as { id: string; title: Bilingual; body: Bilingual }[]).map(
    (item) => ({ id: item.id, title: pick(item.title, lang), body: pick(item.body, lang) }),
  );
}

/* ------------------------------------------------------------------- Learn */

export interface Question {
  id: string;
  message: string;
  answer: "scam" | "legitimate";
  tell: string;
  /** Present on the three drawn from documented campaigns. */
  signals: string[];
  entity?: string;
  sourceName?: string;
  sourceUrl?: string;
  /** True when the message is a reconstruction of the campaign, not a capture. */
  reconstructed: boolean;
}

interface RawQuestion {
  id: string;
  message: Bilingual;
  answer: "scam" | "legitimate";
  tell: Bilingual;
  signals?: { en: string[]; ar: string[] };
  entity?: Bilingual;
  source_name?: Bilingual;
  source_url?: string;
  reconstructed?: boolean;
  verified?: boolean;
}

/**
 * The drill's six. Three are real messages tied to a documented campaign, and
 * carry the source that reported it; three are legitimate messages, which is
 * what stops the drill teaching people to answer "scam" to everything.
 *
 * A question marked `verified: false` does not render, the same rule the rest
 * of the app follows.
 */
export function questions(lang: Lang): Question[] {
  return (quizFile.questions as RawQuestion[])
    .filter((q) => q.verified !== false)
    .map((q) => ({
      id: q.id,
      message: pick(q.message, lang),
      answer: q.answer,
      tell: pick(q.tell, lang),
      signals: q.signals ? (lang === "ar" ? q.signals.ar : q.signals.en) : [],
      entity: q.entity ? pick(q.entity, lang) : undefined,
      sourceName: q.source_name ? pick(q.source_name, lang) : undefined,
      sourceUrl: q.source_url,
      reconstructed: Boolean(q.reconstructed),
    }));
}
