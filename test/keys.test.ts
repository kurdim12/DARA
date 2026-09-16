import { describe, expect, it } from "vitest";
import en from "../src/i18n/en.json";
import ar from "../src/i18n/ar.json";
import {
  ATTACK_GOALS,
  CATEGORIES,
  PRESSURE_METHODS,
  THREAT_TYPES,
  type Lang,
} from "../shared/types";
import { EVIDENCE_TYPES } from "../worker/engine/postvalidate";

/**
 * The result screen builds i18n keys by interpolating values the server chose
 * — `pressure.${method}`, `goal.${attack_goal}`, `evidence.${item.type}`,
 * `url.${signal}`. A miss does not throw: t() falls through to the raw key and
 * prints "pressure.threat" onto the verdict, in front of the jury.
 *
 * postValidate constrains every one of these to a known set. This checks that
 * each of those sets has wording on both sides, so adding a value to the
 * engine without adding the copy fails here rather than on stage.
 */
const URL_SIGNALS = [
  "not_https",
  "ip_hostname",
  "punycode_hostname",
  "many_subdomains",
  "long_hostname",
  "suspicious_words",
  "brand_plus_suspicious_word",
  "claimed_government_non_gov_jo",
] as const;

const DICTS: Record<Lang, Record<string, string>> = { en, ar };

function expectKeys(prefix: string, values: readonly string[]) {
  for (const lang of ["en", "ar"] as Lang[]) {
    for (const value of values) {
      const key = `${prefix}.${value}`;
      expect(DICTS[lang][key], `${lang} is missing ${key}`).toBeTruthy();
    }
  }
}

describe("every value the result screen interpolates has wording", () => {
  it("pressure methods", () => expectKeys("pressure", PRESSURE_METHODS));
  it("attack goals", () => expectKeys("goal", ATTACK_GOALS));
  it("categories", () => expectKeys("category", CATEGORIES));
  it("evidence item types", () => expectKeys("evidence", [...EVIDENCE_TYPES] as string[]));
  it("url signals", () => expectKeys("url", URL_SIGNALS));
  it("report threat types", () => expectKeys("threat", THREAT_TYPES));
});

describe("the two dictionaries agree on what exists", () => {
  it("has the same keys on both sides", () => {
    const onlyEn = Object.keys(en).filter((k) => !(k in ar));
    const onlyAr = Object.keys(ar).filter((k) => !(k in en));
    expect({ onlyEn, onlyAr }).toEqual({ onlyEn: [], onlyAr: [] });
  });

  it("has no blank strings", () => {
    for (const lang of ["en", "ar"] as Lang[]) {
      const blank = Object.entries(DICTS[lang])
        .filter(([, v]) => !v.trim())
        .map(([k]) => k);
      expect(blank, `${lang} has blank values`).toEqual([]);
    }
  });
});
