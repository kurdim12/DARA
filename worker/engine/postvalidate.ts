import {
  ATTACK_GOALS,
  CATEGORIES,
  PRESSURE_METHODS,
  type AttackGoal,
  type Category,
  type EvidenceItem,
  type PressureMethod,
  type RedFlag,
  type Verdict,
} from "../../shared/types";
import { findQuoteSpan, normalize } from "../lib/arabic";
import type { RawVerdict } from "./tool";

export interface PostValidated {
  verdict: Verdict;
  confidence: number;
  category: Category;
  impersonated_entity: string | null;
  headline: string;
  red_flags: RedFlag[];
  actions: string[];
  report_recommended: boolean;
  route_to_shield: boolean;
  attack_goal: AttackGoal;
  requested_action: string | null;
  pressure_methods: PressureMethod[];
  extracted_text: string | null;
  evidence_items: EvidenceItem[];
  /** Counters for EVAL-REPORT.md, never sent to the app. */
  stats: {
    flags_returned: number;
    flags_kept: number;
    dropped_unmatched: number;
    dropped_overlap: number;
    dropped_actions: number;
    dropped_evidence: number;
  };
}

export const EVIDENCE_TYPES = new Set([
  "sender",
  "domain",
  "amount",
  "urgency",
  "data_request",
  "payment_demand",
  "impersonation",
  "instruction",
  "other",
]);

const VERDICTS: Verdict[] = ["scam", "suspicious", "likely_safe"];

/**
 * http(s) links, protocol-relative links, and bare www./domain-looking tokens.
 * Arabic punctuation is excluded from the run: a URL at the end of an Arabic
 * clause is normally followed by ، or ؛, and swallowing it made the action
 * look invented and got it dropped.
 */
const URL_LIKE =
  /(?:https?:\/\/|www\.)[^\s<>"'()[\]{}،؛؟«»]+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|biz|co|io|me|jo|gov|edu|xyz|top|link|live|site|online|shop|pay|app)\b(?:\/[^\s<>"'()[\]{}،؛؟«»]*)?/gi;

/** Trailing punctuation that ends a sentence rather than belonging to the URL. */
const TRAILING_PUNCTUATION = /[.,;:!?،؛؟»)\]]+$/u;

/** 6+ digits, optionally grouped by spaces, dashes, dots or parentheses. */
const PHONE_LIKE = /\+?\d[\d\s().-]{4,}\d/g;

/** Every separate run of digits in the message, each collapsed to bare digits. */
const NUMBER_RUN = /\+?\d[\d\s().-]*\d|\d/g;

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

/**
 * A number counts as present only if it sits inside ONE run of digits in the
 * message. Matching against every digit in the message glued together let a
 * fabricated number be assembled out of pieces of unrelated ones — an order
 * number, a price and a deadline — and shown to the user as a real one.
 */
function numberRuns(haystack: string): string[] {
  return (haystack.match(NUMBER_RUN) ?? []).map(digitsOnly).filter(Boolean);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Everything the engine returns is treated as a claim to be checked against the
 * message the user actually pasted. Nothing that fails a check reaches the app.
 */
export function postValidate(
  raw: RawVerdict,
  originalText: string,
  options?: { fromScreenshot?: boolean },
): PostValidated {
  const verdict = VERDICTS.includes(raw.verdict as Verdict)
    ? (raw.verdict as Verdict)
    : null;
  if (!verdict) {
    throw new Error(`engine returned an unusable verdict: ${String(raw.verdict)}`);
  }

  const headline = asString(raw.headline);
  if (!headline) {
    throw new Error("engine returned an empty headline");
  }

  let category: Category = CATEGORIES.includes(raw.category as Category)
    ? (raw.category as Category)
    : "other";
  if (verdict === "likely_safe" && category === "other") category = "none";

  // Clamp to the schema's range, then cap a "looks safe" claim: the engine may
  // not tell anyone a message is certainly safe.
  let confidence =
    typeof raw.confidence === "number" && Number.isFinite(raw.confidence)
      ? Math.round(raw.confidence)
      : 50;
  confidence = Math.min(100, Math.max(0, confidence));
  if (verdict === "likely_safe") confidence = Math.min(90, confidence);

  const rawFlags = Array.isArray(raw.red_flags) ? raw.red_flags.slice(0, 4) : [];
  const kept: RedFlag[] = [];
  let droppedUnmatched = 0;
  let droppedOverlap = 0;

  for (const item of rawFlags) {
    if (!item || typeof item !== "object") {
      droppedUnmatched++;
      continue;
    }
    const quote = asString((item as { quote?: unknown }).quote);
    const why = asString((item as { why?: unknown }).why);
    if (!quote || !why) {
      droppedUnmatched++;
      continue;
    }

    const span = findQuoteSpan(originalText, quote);
    if (!span) {
      droppedUnmatched++;
      continue;
    }

    // Two highlights over the same characters cannot both render, so the
    // first one wins and the second is dropped.
    const overlaps = kept.some((f) => span.start < f.end && f.start < span.end);
    if (overlaps) {
      droppedOverlap++;
      continue;
    }

    kept.push({
      quote: originalText.slice(span.start, span.end),
      why,
      start: span.start,
      end: span.end,
    });
  }

  kept.sort((a, b) => a.start - b.start);

  const haystack = normalize(originalText);
  const haystackNumbers = numberRuns(haystack);
  const rawActions = Array.isArray(raw.actions) ? raw.actions : [];
  const actions: string[] = [];
  let droppedActions = 0;

  for (const entry of rawActions) {
    const action = asString(entry);
    if (!action) continue;
    if (actions.length >= 3) break;

    // An action may only mention a link or a number that the message itself
    // contains. Anything else would be the app inventing contact details.
    const urls = action.match(URL_LIKE) ?? [];
    const phones = action.match(PHONE_LIKE) ?? [];

    const inventedUrl = urls.some(
      (url) => !haystack.includes(normalize(url).replace(TRAILING_PUNCTUATION, "")),
    );
    const inventedPhone = phones.some((phone) => {
      const digits = digitsOnly(phone);
      if (digits.length < 6) return false;
      return !haystackNumbers.some((run) => run.includes(digits));
    });

    if (inventedUrl || inventedPhone) {
      droppedActions++;
      continue;
    }
    actions.push(action);
  }

  const impersonated = asString(raw.impersonated_entity);

  const attack_goal: AttackGoal = ATTACK_GOALS.includes(raw.attack_goal as AttackGoal)
    ? (raw.attack_goal as AttackGoal)
    : "unknown";

  const requested_action = asString(raw.requested_action) || null;

  const pressure_methods = (Array.isArray(raw.pressure_methods) ? raw.pressure_methods : [])
    .filter((m): m is PressureMethod => PRESSURE_METHODS.includes(m as PressureMethod))
    .filter((m, i, all) => all.indexOf(m) === i)
    .slice(0, 3);

  // Evidence items describe what was on a screen. For a pasted message there
  // was no screen, so anything here was imagined and is dropped.
  const rawEvidence =
    options?.fromScreenshot && Array.isArray(raw.evidence_items) ? raw.evidence_items : [];
  const evidence_items: EvidenceItem[] = [];
  let droppedEvidence = 0;
  for (const item of rawEvidence.slice(0, 6)) {
    if (!item || typeof item !== "object") {
      droppedEvidence++;
      continue;
    }
    const entry = item as { type?: unknown; value?: unknown; why?: unknown };
    const type = asString(entry.type);
    const value = asString(entry.value);
    const why = asString(entry.why);
    if (!EVIDENCE_TYPES.has(type) || !value || !why) {
      droppedEvidence++;
      continue;
    }
    evidence_items.push({ type, value, why });
  }

  // The OCR step owns the transcription now; the engine never sees the image,
  // so anything it puts here would be invention. Always dropped.
  const extracted_text = null;

  return {
    verdict,
    confidence,
    category,
    impersonated_entity: impersonated || null,
    headline,
    red_flags: kept,
    actions,
    report_recommended:
      raw.report_recommended === true ||
      (verdict !== "likely_safe" && raw.report_recommended !== false),
    // The extortion route is not the engine's to decline: a victim of
    // blackmail gets the Shield flow regardless of how it filled the field.
    route_to_shield: raw.route_to_shield === true || category === "extortion",
    attack_goal,
    requested_action,
    pressure_methods,
    extracted_text,
    evidence_items,
    stats: {
      flags_returned: rawFlags.length,
      flags_kept: kept.length,
      dropped_unmatched: droppedUnmatched,
      dropped_overlap: droppedOverlap,
      dropped_actions: droppedActions,
      dropped_evidence: droppedEvidence,
    },
  };
}
