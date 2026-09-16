import type { AnalyzeResponse, Verdict } from "../../shared/types";
import type { TextKey } from "../i18n";

export type Level = "high" | "medium" | "low" | "safe";

/**
 * The engine returns three verdicts; the screen shows four levels. Scam and
 * suspicious map straight across. `likely_safe` splits on the engine's own
 * confidence — it caps that verdict at 90 by design, so a confident
 * likely-safe reads as Safe and a hesitant one reads as Low risk rather than
 * telling someone an unfamiliar message is fine.
 */
export const SAFE_CONFIDENCE = 70;

export function levelFor(result: Pick<AnalyzeResponse, "verdict" | "confidence">): Level {
  const verdict: Verdict = result.verdict;
  if (verdict === "scam") return "high";
  if (verdict === "suspicious") return "medium";
  return result.confidence >= SAFE_CONFIDENCE ? "safe" : "low";
}

/**
 * The word the verdict card leads with. Three verdicts, not four levels: the
 * brief maps medium and low both onto "suspicious", because a person reading
 * this needs to know whether to act, not which of two middles they are in.
 * The level word sits underneath as the finer grain.
 */
export const VERDICT_WORD: Record<Level, TextKey> = {
  high: "verdict.scam",
  medium: "verdict.suspicious",
  low: "verdict.suspicious",
  safe: "verdict.likely_safe",
};

export const LEVEL_LABEL: Record<Level, TextKey> = {
  high: "level.high",
  medium: "level.medium",
  low: "level.low",
  safe: "level.safe",
};

/**
 * Colour is meaning here, and there are only three: red is a scam, amber is
 * suspicious — which is where the brief maps both medium and low — and green
 * is only ever a clean result. Each level names the text colour legible on its
 * fill; amber takes ink, because nothing white clears 4.5:1 on it.
 */
export const LEVEL_FILL: Record<Level, { bg: string; text: string }> = {
  high: { bg: "bg-red", text: "text-white-brush" },
  medium: { bg: "bg-amber-fill", text: "text-on-amber" },
  low: { bg: "bg-amber-fill", text: "text-on-amber" },
  safe: { bg: "bg-green-fill", text: "text-white-brush" },
};
