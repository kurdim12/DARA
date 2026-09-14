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

export const LEVEL_LABEL: Record<Level, TextKey> = {
  high: "level.high",
  medium: "level.medium",
  low: "level.low",
  safe: "level.safe",
};

/**
 * Colour is meaning here: red is danger, amber is caution, blue is a low
 * finding and green is only ever Safe. The verdict card is a solid fill, so
 * each level also names the text colour that is legible on it — white
 * everywhere except amber, which no white text clears 4.5:1 against.
 */
export const LEVEL_FILL: Record<Level, { bg: string; text: string }> = {
  high: { bg: "bg-red-fill", text: "text-white" },
  medium: { bg: "bg-amber", text: "text-on-amber" },
  low: { bg: "bg-blue-fill", text: "text-white" },
  safe: { bg: "bg-green-fill", text: "text-white" },
};
