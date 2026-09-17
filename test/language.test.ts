import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { campaigns } from "../src/lib/campaigns";
import { seedKeys, seedText } from "../src/lib/seeds";
import seedFile from "../content/community-seed.json";
import campaignFile from "../content/campaigns.json";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/** Any Arabic letter. Latin digits and punctuation are shared, so this is the test. */
const ARABIC = /[؀-ۿ]/;

/**
 * P2-5. Walked in ar and then in en, the app leaked in both directions: the
 * four seeded community reports were English inside the Arabic UI, and eleven
 * of fifteen campaigns fell back to their Arabic summary and source name
 * inside the English one.
 */
describe("every campaign renders in the language asked for", () => {
  it("has no Arabic left in an English card", () => {
    for (const campaign of campaigns("en")) {
      for (const [field, value] of Object.entries({
        title: campaign.title,
        summary: campaign.summary,
        entity: campaign.entity,
        sourceName: campaign.sourceName,
      })) {
        expect(ARABIC.test(value), `${campaign.id}.${field} is Arabic in en: ${value}`).toBe(false);
      }
    }
  });

  it("has no English prose left in an Arabic card", () => {
    /**
     * Names that are the same string in Arabic — a product, a protocol, a
     * company that brands itself in Latin. Leaving «iMessage» as «iMessage» in
     * an Arabic sentence is correct; transliterating it would be the error.
     * Anything NOT on this list is prose that should have been translated.
     */
    const SAME_IN_BOTH = /^(iMessage|WhatsApp|Jordan|Post|SMS|OTP|ID|URL)$/i;
    const LATIN_WORD = /\b[A-Za-z]{4,}\b/g;
    for (const campaign of campaigns("ar")) {
      for (const [field, value] of Object.entries({
        title: campaign.title,
        summary: campaign.summary,
      })) {
        const words = (value.match(LATIN_WORD) ?? []).filter((w) => !SAME_IN_BOTH.test(w));
        expect(words, `${campaign.id}.${field} holds English: ${words.join(", ")}`).toEqual([]);
      }
    }
  });

  it("keeps the specimen in the language it arrived in, and translates beside it", () => {
    // The Arabic is the artifact — it is what a person received and what gets
    // pasted into the scanner. Replacing it with a translation would be
    // quoting something nobody sent.
    for (const campaign of campaigns("en")) {
      if (!campaign.sample) continue;
      expect(ARABIC.test(campaign.sample), `${campaign.id} translated its own specimen`).toBe(true);
      expect(campaign.sampleTranslation, `${campaign.id} has no translation in en`).toBeTruthy();
    }
    // And in Arabic there is nothing to translate.
    for (const campaign of campaigns("ar")) {
      expect(campaign.sampleTranslation, `${campaign.id} translates into Arabic`).toBeUndefined();
    }
  });

  it("carries both languages on every field the content file defines", () => {
    for (const raw of (campaignFile as { campaigns: Record<string, unknown>[] }).campaigns) {
      for (const base of ["title", "summary", "entity", "source_name"]) {
        expect(raw[`${base}_ar`], `${raw.id}.${base}_ar`).toBeTruthy();
        expect(raw[`${base}_en`], `${raw.id}.${base}_en`).toBeTruthy();
      }
    }
  });
});

describe("the seeded community reports speak the reader's language", () => {
  it("has both languages for every seed", () => {
    for (const seed of (seedFile as { reports: { key: string; description: { en: string; ar: string } }[] }).reports) {
      expect(seed.description.en.trim(), `${seed.key}.en`).toBeTruthy();
      expect(seed.description.ar.trim(), `${seed.key}.ar`).toBeTruthy();
      expect(ARABIC.test(seed.description.ar), `${seed.key}.ar is not Arabic`).toBe(true);
      expect(ARABIC.test(seed.description.en), `${seed.key}.en holds Arabic`).toBe(false);
    }
  });

  it("gives every key in the content file a row in the migration", () => {
    // A key the app renders from but the database never sets is a seed that
    // silently keeps showing its English column.
    const sql = read("migrations/0005_seed_language.sql");
    for (const key of seedKeys()) {
      expect(sql, `the migration never sets ${key}`).toContain(`seed_key = '${key}'`);
    }
  });

  it("leaves a real report's own words alone", () => {
    // Somebody else's sentence is not ours to swap out for a translation.
    expect(seedText(null, "ar")).toBeNull();
    expect(seedText("not_a_seed", "ar")).toBeNull();
    expect(read("src/routes/Report.tsx")).toContain("seedText(row.seed_key, lang) ?? row.description");
  });
});

describe("the feed survives a database that has not caught up", () => {
  it("asks for seed_key, and asks again without it when the column is missing", () => {
    // A Worker deploys before its migrations run against the remote database.
    // Asking for a column that is not there throws, and the catch below it
    // answers with an empty feed — the whole section would vanish rather than
    // show its English seeds for an hour.
    const worker = read("worker/index.ts");
    const block = worker.slice(
      worker.indexOf('app.get("/api/reports/community"'),
      worker.indexOf("});", worker.indexOf("community feed failed")),
    );
    expect(block).toContain("const select = (withKey: boolean)");
    expect(block).toMatch(/rows = await select\(true\);[\s\S]*?rows = await select\(false\);/);
  });
});
