import { describe, expect, it } from "vitest";
import { dateLocale } from "../src/lib/locale";

/**
 * CLAUDE.md: "Use Latin digits everywhere." An ar-JO date formats in
 * Arabic-Indic digits unless the locale asks otherwise, and the app formats
 * campaign dates, radar days and the radar's generated-at stamp, so the rule
 * is checked here rather than in a screenshot.
 */
const ARABIC_INDIC = /[٠-٩۰-۹]/;
const WHEN = new Date("2026-08-27T09:05:00Z");

describe("dates render in Latin digits", () => {
  for (const lang of ["ar", "en"] as const) {
    it(`${lang}: a campaign date has no Arabic-Indic digits`, () => {
      const out = WHEN.toLocaleDateString(dateLocale(lang), {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      expect(out).not.toMatch(ARABIC_INDIC);
      expect(out).toMatch(/2026/);
    });

    it(`${lang}: a date and time stamp has no Arabic-Indic digits`, () => {
      const out = WHEN.toLocaleString(dateLocale(lang), {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "UTC",
      });
      expect(out).not.toMatch(ARABIC_INDIC);
    });
  }

  it("Arabic still renders in Arabic, just with Latin numerals", () => {
    const out = WHEN.toLocaleDateString(dateLocale("ar"), {
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    expect(out).toMatch(/[ء-ي]/);
    expect(out).not.toMatch(ARABIC_INDIC);
  });

  it("an unknown language falls back rather than throwing", () => {
    expect(dateLocale("de" as never)).toBe("en-GB");
  });
});
