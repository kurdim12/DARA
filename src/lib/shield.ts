import accountHacked from "../../content/shield/account_hacked.json";
import afraidSafety from "../../content/shield/afraid_safety.json";
import dataStolen from "../../content/shield/data_stolen.json";
import moneyDemands from "../../content/shield/money_demands.json";
import privatePhotos from "../../content/shield/private_photos.json";
import type { Lang } from "../../shared/types";

export type SituationId =
  | "private_photos"
  | "money_demands"
  | "account_hacked"
  | "afraid_safety"
  | "data_stolen";

interface Bilingual {
  en: string;
  ar: string;
}

interface RawSituation {
  title: Bilingual;
  summary: Bilingual;
  intro: Bilingual;
  steps: Bilingual[];
  verified: boolean;
}

/** Order matters: the two most urgent situations come first. */
const FILES: Record<SituationId, RawSituation> = {
  private_photos: privatePhotos as RawSituation,
  money_demands: moneyDemands as RawSituation,
  account_hacked: accountHacked as RawSituation,
  afraid_safety: afraidSafety as RawSituation,
  data_stolen: dataStolen as RawSituation,
};

export interface Situation {
  id: SituationId;
  title: string;
  summary: string;
  intro: string;
  steps: string[];
}

function pick(text: Bilingual, lang: Lang): string {
  return lang === "ar" ? text.ar : text.en;
}

export function situations(lang: Lang): Situation[] {
  return (Object.keys(FILES) as SituationId[])
    .filter((id) => FILES[id].verified)
    .map((id) => {
      const raw = FILES[id];
      return {
        id,
        title: pick(raw.title, lang),
        summary: pick(raw.summary, lang),
        intro: pick(raw.intro, lang),
        steps: raw.steps.map((step) => pick(step, lang)),
      };
    });
}
