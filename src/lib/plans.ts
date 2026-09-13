import accountHacked from "../../content/recover/account_hacked.json";
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
  | "account_hacked"
  | "data_stolen"
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

/** Order matters: losing money is the one where minutes count. */
const PLAN_FILES: Record<PlanId, RawPlan> = {
  money_lost: moneyLost as RawPlan,
  account_hacked: accountHacked as RawPlan,
  data_stolen: dataStolen as RawPlan,
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
}

export function questions(lang: Lang): Question[] {
  return (
    quizFile.questions as {
      id: string;
      message: Bilingual;
      answer: "scam" | "legitimate";
      tell: Bilingual;
    }[]
  ).map((q) => ({
    id: q.id,
    message: pick(q.message, lang),
    answer: q.answer,
    tell: pick(q.tell, lang),
  }));
}
