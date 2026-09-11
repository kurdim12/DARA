import patternsFile from "../../content/verified-threat-patterns.json";
import type { UrlSignalCode } from "./url";

/**
 * Matching an analysis against documented Jordanian scam patterns.
 *
 * The comparison is deterministic and done here, in code. The model is never
 * asked "does this look like a known Jordan scam?" — it has no way to know, and
 * an answer from it would be a guess wearing the clothes of evidence.
 *
 * Only entries marked `verified: true` are ever considered, and the corpus is
 * empty until real evidence is added, so today this returns null every time.
 */

export interface ThreatPattern {
  id: string;
  title_ar: string;
  title_en: string;
  impersonated_entity?: string;
  categories?: string[];
  channels?: string[];
  attack_goals?: string[];
  indicators?: string[];
  pressure_methods?: string[];
  url_signals?: string[];
  source_name?: string;
  source_date?: string;
  verified?: boolean;
}

export interface ThreatMatch {
  pattern_id: string;
  confidence: "strong";
  /** Indicator ids the caller turns into words. Never raw model output. */
  matched_signals: string[];
}

export interface MatchInput {
  category: string;
  impersonated_entity: string | null;
  channel?: string;
  attack_goal: string;
  pressure_methods: string[];
  url_signals: UrlSignalCode[];
}

const PATTERNS: ThreatPattern[] = (
  (patternsFile as { patterns?: ThreatPattern[] }).patterns ?? []
).filter((p) => p.verified === true);

/** True when the corpus has anything to match against at all. */
export const HAS_VERIFIED_PATTERNS = PATTERNS.length > 0;

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Scored on the parts that are hard to coincide: who it claims to be, what it
 * is after, how it applies pressure, and what the link looks like. A shared
 * category alone is not a match — half the golden set shares a category.
 */
function score(pattern: ThreatPattern, input: MatchInput) {
  const matched: string[] = [];
  let points = 0;

  if (pattern.categories?.includes(input.category)) {
    points += 2;
    matched.push(`category:${input.category}`);
  }

  if (
    pattern.impersonated_entity &&
    input.impersonated_entity &&
    normalise(pattern.impersonated_entity) === normalise(input.impersonated_entity)
  ) {
    points += 3;
    matched.push(`entity:${pattern.impersonated_entity}`);
  }

  if (pattern.attack_goals?.includes(input.attack_goal) && input.attack_goal !== "unknown") {
    points += 2;
    matched.push(`goal:${input.attack_goal}`);
  }

  if (input.channel && pattern.channels?.includes(input.channel)) {
    points += 1;
    matched.push(`channel:${input.channel}`);
  }

  for (const method of input.pressure_methods) {
    if (pattern.pressure_methods?.includes(method)) {
      points += 1;
      matched.push(`pressure:${method}`);
    }
  }

  for (const signal of input.url_signals) {
    if (pattern.url_signals?.includes(signal)) {
      points += 2;
      matched.push(`url:${signal}`);
    }
  }

  return { points, matched };
}

/** Deliberately high: a weak resemblance must produce nothing. */
const STRONG_THRESHOLD = 7;

/**
 * `patterns` exists so the scoring can be tested against fixtures. Fixtures are
 * engine tests, never evidence: production always uses the verified corpus.
 */
export function matchVerifiedPattern(
  input: MatchInput,
  patterns: ThreatPattern[] = PATTERNS,
): ThreatMatch | null {
  let best: { pattern: ThreatPattern; points: number; matched: string[] } | null = null;

  for (const pattern of patterns) {
    const { points, matched } = score(pattern, input);
    if (!best || points > best.points) best = { pattern, points, matched };
  }

  if (!best || best.points < STRONG_THRESHOLD) return null;

  // A match that rests only on the category is a coincidence, not a pattern.
  const distinct = new Set(best.matched.map((m) => m.split(":")[0]));
  if (distinct.size < 3) return null;

  return {
    pattern_id: best.pattern.id,
    confidence: "strong",
    matched_signals: best.matched.slice(0, 4),
  };
}

export function patternById(id: string): ThreatPattern | null {
  return PATTERNS.find((p) => p.id === id) ?? null;
}
