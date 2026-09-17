import type {
  AttackGoal,
  Category,
  Lang,
  PressureMethod,
  Verdict,
} from "../../shared/types";
import type { UrlFacts } from "./url";

/**
 * Deterministic signals read from the text itself, and the preliminary verdict
 * they can build without any model at all.
 *
 * Two jobs, both about the model taking 6-10 seconds:
 *
 * 1. Run FIRST, so the model is asked a narrower question with the facts
 *    already on the table.
 * 2. Stand in for the model when it times out or fails. A preliminary result
 *    is worth far more than «تعذّر إكمال الفحص» — but it must never pass for a
 *    full analysis, so it is tagged, capped at low confidence, and says in its
 *    own headline that the server could not be reached.
 *
 * Nothing here invents. Every signal is a phrase that is literally present,
 * and the quotes handed back are substrings of the input.
 */

export type TextSignalCode =
  | "asks_for_otp"
  | "asks_for_card"
  | "asks_for_password"
  | "asks_for_personal_data"
  | "demands_payment"
  | "deadline_pressure"
  | "threat_language"
  | "prize_language"
  | "job_offer_language"
  | "secrecy_language";

export interface TextSignal {
  code: TextSignalCode;
  /** The phrase, exactly as it appears in the input. */
  quote: string;
  /** Offsets into the unmodified input, so the span can be underlined. */
  start: number;
  end: number;
}

/**
 * Arabic and English phrases, matched case-insensitively on the raw input.
 *
 * Deliberately narrow. A false positive here becomes a red flag on a real
 * person's screen, so each phrase has to be one that is hard to write
 * innocently in a message to a stranger.
 */
const PHRASES: { code: TextSignalCode; terms: string[] }[] = [
  {
    code: "asks_for_otp",
    terms: [
      "رمز التحقق", "رمز التفعيل", "الرمز المرسل", "اقرأه لي", "زودني بالرمز",
      "verification code", "otp", "one-time code", "code sent to",
    ],
  },
  {
    code: "asks_for_card",
    terms: [
      "رقم البطاقة", "بيانات البطاقة", "الرقم السري", "cvv", "رمز البطاقة",
      "card number", "card details", "cvc",
    ],
  },
  {
    code: "asks_for_password",
    terms: ["كلمة المرور", "كلمة السر", "password", "passcode"],
  },
  {
    code: "asks_for_personal_data",
    terms: [
      "الرقم الوطني", "رقم الهوية", "تحديث بياناتك", "تحديث البيانات",
      "national id", "id number", "update your details", "confirm your identity",
    ],
  },
  {
    code: "demands_payment",
    terms: [
      "حوّل", "حول مبلغ", "ادفع", "رسوم", "رسوم تسجيل", "عمولة", "دينار",
      "transfer", "pay ", "fee", "registration fee",
    ],
  },
  {
    code: "deadline_pressure",
    terms: [
      "خلال 24 ساعة", "خلال ٢٤ ساعة", "خلال ساعة", "قبل انتهاء", "فوراً", "فورا",
      "حالاً", "آخر تحذير", "within 24 hours", "immediately", "last warning",
      "expires today",
    ],
  },
  {
    code: "threat_language",
    terms: [
      "سيتم إيقاف", "سيتم تعليق", "سيتم حظر", "مذكرة", "ملاحقة قانونية",
      "رح أبعث", "سأنشر", "will be suspended", "will be blocked", "legal action",
    ],
  },
  {
    code: "prize_language",
    terms: [
      "مبروك", "فزت", "فاز", "جائزة", "ربحت", "congratulations", "you won",
      "prize", "winner",
    ],
  },
  {
    code: "job_offer_language",
    terms: [
      "عمل من المنزل", "دخل شهري", "لا خبرة مطلوبة", "نستقطب",
      "work from home", "no experience", "earn daily",
    ],
  },
  {
    code: "secrecy_language",
    terms: ["لا تخبر أحد", "بينك وبيني", "سرية تامة", "don't tell anyone", "keep this between"],
  },
];

/** Every phrase that is literally in the text, with the text's own wording. */
export function inspectTextSignals(input: string): TextSignal[] {
  const haystack = input.toLowerCase();
  const found: TextSignal[] = [];
  const seen = new Set<TextSignalCode>();

  for (const { code, terms } of PHRASES) {
    for (const term of terms) {
      const at = haystack.indexOf(term.toLowerCase());
      if (at === -1) continue;
      if (seen.has(code)) break;
      seen.add(code);
      // Give the quote back in the original casing and script, with the
      // offsets the result screen needs to underline it in place.
      const end = at + term.length;
      found.push({ code, quote: input.slice(at, end), start: at, end });
      break;
    }
  }
  return found;
}

/** Which category the signals point at. `other` when they disagree. */
function categoryFor(signals: TextSignalCode[], url: UrlFacts | null): Category {
  if (signals.includes("asks_for_otp")) return "otp_theft";
  if (signals.includes("threat_language") && signals.includes("secrecy_language")) {
    return "extortion";
  }
  if (signals.includes("prize_language")) return "fake_prize";
  if (signals.includes("job_offer_language")) return "fake_job";
  if (url?.signals.includes("claimed_government_non_gov_jo")) {
    return "impersonation_government";
  }
  if (signals.includes("asks_for_card") || signals.includes("asks_for_password")) {
    return "phishing_link";
  }
  if (url) return "phishing_link";
  return "other";
}

function goalFor(signals: TextSignalCode[]): AttackGoal {
  if (signals.includes("asks_for_otp")) return "steal_otp";
  if (signals.includes("asks_for_card") || signals.includes("asks_for_password")) {
    return "steal_credentials";
  }
  if (signals.includes("demands_payment")) return "obtain_payment";
  if (signals.includes("asks_for_personal_data")) return "obtain_personal_data";
  if (signals.includes("threat_language")) return "extortion";
  return "unknown";
}

function pressureFor(signals: TextSignalCode[]): PressureMethod[] {
  const out: PressureMethod[] = [];
  if (signals.includes("deadline_pressure")) out.push("urgency");
  if (signals.includes("threat_language")) out.push("fear");
  if (signals.includes("prize_language")) out.push("reward");
  if (signals.includes("secrecy_language")) out.push("secrecy");
  return out;
}

export interface Preliminary {
  verdict: Verdict;
  confidence: number;
  category: Category;
  attack_goal: AttackGoal;
  pressure_methods: PressureMethod[];
  signals: TextSignalCode[];
  /** Quotes to underline. Every one is a substring of the input. */
  quotes: TextSignal[];
}

/**
 * A verdict from the signals alone.
 *
 * Confidence is capped at 60 no matter how many signals fire. This is pattern
 * matching, not comprehension: it cannot read tone, cannot tell a warning
 * about a scam from the scam, and must never look as certain as the engine.
 */
export function preliminaryVerdict(text: string, url: UrlFacts | null): Preliminary {
  const quotes = inspectTextSignals(text);
  const signals = quotes.map((q) => q.code);

  // Each signal is weak alone. Danger is signals agreeing with each other.
  const urlRisk = url ? url.signals.length : 0;
  const asksForSecret =
    signals.includes("asks_for_otp") ||
    signals.includes("asks_for_card") ||
    signals.includes("asks_for_password");
  const pressured =
    signals.includes("deadline_pressure") || signals.includes("threat_language");

  let score = signals.length + urlRisk;
  if (asksForSecret && pressured) score += 3;
  if (asksForSecret && url) score += 2;
  if (url?.signals.includes("brand_plus_suspicious_word")) score += 2;
  if (url?.signals.includes("claimed_government_non_gov_jo")) score += 3;
  if (url?.signals.includes("ip_hostname")) score += 2;

  const verdict: Verdict = score >= 5 ? "scam" : score >= 2 ? "suspicious" : "likely_safe";
  // 60 for a strong pattern, 45 for a weak one, 30 when nothing fired — never
  // the 90s the engine reaches, because this did not read anything.
  const confidence = score >= 5 ? 60 : score >= 2 ? 45 : 30;

  return {
    verdict,
    confidence,
    category: categoryFor(signals, url),
    attack_goal: goalFor(signals),
    pressure_methods: pressureFor(signals),
    signals,
    quotes,
  };
}

/** The keys the UI uses to word a preliminary result, per signal. */
export const SIGNAL_REASON: Record<TextSignalCode, string> = {
  asks_for_otp: "prelim.otp",
  asks_for_card: "prelim.card",
  asks_for_password: "prelim.password",
  asks_for_personal_data: "prelim.data",
  demands_payment: "prelim.payment",
  deadline_pressure: "prelim.deadline",
  threat_language: "prelim.threat",
  prize_language: "prelim.prize",
  job_offer_language: "prelim.job",
  secrecy_language: "prelim.secrecy",
};

/** Lang is accepted so callers can stay symmetric with the engine's signature. */
export type PreliminaryLang = Lang;
