import type { AnalyzeResponse, Lang } from "../../shared/types";
import { preliminaryVerdict, SIGNAL_REASON } from "./heuristics";
import type { UrlFacts } from "./url";

/**
 * The answer when the engine could not be reached.
 *
 * Shaped exactly like a real verdict so the result screen needs no second
 * layout, and marked `preliminary: true` so that screen can say what it is.
 * Three things keep it honest:
 *
 * - confidence is capped well below what the engine reaches;
 * - the headline says the server was not reached, in the user's own language,
 *   rather than implying an analysis happened;
 * - every red-flag quote is a substring of the input, so the underlines still
 *   land on real words and nothing is invented.
 *
 * It returns null when there is genuinely nothing to say — no signals, no URL
 * facts. A confident "looks fine" from pattern matching alone would be worse
 * than an error, because it is the one case where being wrong is dangerous.
 */
export function preliminaryResponse(
  text: string,
  urlFacts: UrlFacts | null,
  lang: Lang,
  fromScreenshot: boolean,
): (AnalyzeResponse & { stats?: unknown }) | null {
  const prelim = preliminaryVerdict(text, urlFacts);

  // Nothing fired. Saying "looks safe" on that basis would be a guess, and a
  // guess in the safe direction is the expensive one.
  if (prelim.signals.length === 0 && (!urlFacts || urlFacts.signals.length === 0)) {
    return null;
  }

  const headline =
    lang === "ar"
      ? "تحليل مبدئي: تعذّر الوصول إلى الخادم، وهذه مؤشرات ظاهرة في النص نفسه."
      : "Preliminary: the server could not be reached. These are signals visible in the text itself.";

  const actions =
    lang === "ar"
      ? [
          "أعد الفحص بعد قليل للحصول على تحليل كامل.",
          "لا تدفع ولا تشارك أي رمز أو بيانات قبل التحقق بنفسك.",
        ]
      : [
          "Check again shortly for a full analysis.",
          "Do not pay or share any code or details before verifying yourself.",
        ];

  return {
    verdict: prelim.verdict,
    confidence: prelim.confidence,
    category: prelim.category,
    impersonated_entity: null,
    headline,
    // Quotes are substrings of the input, so the spans still highlight.
    red_flags: prelim.quotes.map((q) => ({
      quote: q.quote,
      why: SIGNAL_REASON[q.code],
      start: q.start,
      end: q.end,
    })),
    actions,
    // A preliminary read is not a basis for telling someone to file a report.
    report_recommended: false,
    route_to_shield: prelim.category === "extortion",
    attack_goal: prelim.attack_goal,
    requested_action: null,
    pressure_methods: prelim.pressure_methods,
    input_kind: fromScreenshot ? "image" : "text",
    model: "local-heuristics",
    latency_ms: 0,
    preliminary: true,
    preliminary_signals: prelim.signals,
  };
}
