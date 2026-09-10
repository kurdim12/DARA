import {
  CATEGORIES,
  type Category,
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
  /** Counters for EVAL-REPORT.md, never sent to the app. */
  stats: {
    flags_returned: number;
    flags_kept: number;
    dropped_unmatched: number;
    dropped_overlap: number;
    dropped_actions: number;
  };
}

const VERDICTS: Verdict[] = ["scam", "suspicious", "likely_safe"];

/** http(s) links, protocol-relative links, and bare www./domain-looking tokens. */
const URL_LIKE =
  /(?:https?:\/\/|www\.)[^\s<>"'()[\]{}]+|\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9-]+)*\.(?:com|net|org|info|biz|co|io|me|jo|gov|edu|xyz|top|link|live|site|online|shop|pay|app)\b(?:\/[^\s<>"'()[\]{}]*)?/gi;

/** 6+ digits, optionally grouped by spaces, dashes, dots or parentheses. */
const PHONE_LIKE = /\+?\d[\d\s().-]{4,}\d/g;

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, "");
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Everything the engine returns is treated as a claim to be checked against the
 * message the user actually pasted. Nothing that fails a check reaches the app.
 */
export function postValidate(raw: RawVerdict, originalText: string): PostValidated {
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
      (url) => !haystack.includes(normalize(url).replace(/[.,;:]+$/, "")),
    );
    const inventedPhone = phones.some((phone) => {
      const digits = digitsOnly(phone);
      if (digits.length < 6) return false;
      return !digitsOnly(haystack).includes(digits);
    });

    if (inventedUrl || inventedPhone) {
      droppedActions++;
      continue;
    }
    actions.push(action);
  }

  const impersonated = asString(raw.impersonated_entity);

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
    stats: {
      flags_returned: rawFlags.length,
      flags_kept: kept.length,
      dropped_unmatched: droppedUnmatched,
      dropped_overlap: droppedOverlap,
      dropped_actions: droppedActions,
    },
  };
}
