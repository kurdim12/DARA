import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * DARA' is for a person in Jordan reading an Arabic SMS. Opening in English
 * asked every one of them to translate the app before they could use it.
 *
 * Three places decide this and they have to agree. The provider decides what
 * React renders; index.html decides the FIRST PAINT, before any JavaScript
 * runs — get that wrong and the page draws left-to-right and flips a frame
 * later, which is the most visible bug an RTL app can have; and the manifest
 * decides what the installed app says it is.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the app is Arabic-first", () => {
  it("serves lang=ar dir=rtl before any script runs", () => {
    const html = read("index.html");
    expect(html).toMatch(/<html[^>]*lang="ar"/);
    expect(html).toMatch(/<html[^>]*dir="rtl"/);
  });

  it("falls back to Arabic, not English, when nothing is stored", () => {
    const provider = read("src/i18n/index.tsx");
    // English is the opt-in: anything other than a stored "en" means Arabic.
    expect(provider).toMatch(/=== "en" \? "en" : "ar"/);
    expect(provider).toMatch(/catch \{\s*return "ar";/);
  });

  it("installs as an Arabic app", () => {
    const config = read("vite.config.ts");
    expect(config).toMatch(/lang: "ar"/);
    expect(config).toMatch(/dir: "rtl"/);
  });

  it("never points the reader at a tab that is not in the bar", () => {
    // Found the hard way: the pilot note — the honesty sentence a jury is most
    // likely to read — sent people to "تبويب الحماية" in Arabic and "the Help
    // tab" in English, months after the bar stopped having either. Arabic is
    // the default now, so the Arabic copy is the copy that gets read.
    const nav = read("src/components/BottomNav.tsx");
    const keys = [...nav.matchAll(/label: "(nav\.[a-z]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBe(5);

    for (const [file, marker] of [
      ["src/i18n/ar.json", "تبويب"],
      ["src/i18n/en.json", " tab"],
    ]) {
      const dict = JSON.parse(read(file)) as Record<string, string>;
      const labels = keys.map((key) => dict[key]);
      for (const [key, value] of Object.entries(dict)) {
        if (!value.includes(marker)) continue;
        expect(
          labels.some((label) => value.includes(label)),
          `${file} → ${key} names a tab that is not in the bar: ${value}`,
        ).toBe(true);
      }
    }
  });

  it("still has an English string for every Arabic one", () => {
    // Arabic-first is not Arabic-only; the toggle has to have somewhere to go.
    const en = JSON.parse(read("src/i18n/en.json"));
    const ar = JSON.parse(read("src/i18n/ar.json"));
    expect(Object.keys(en).length).toBe(Object.keys(ar).length);
    expect(Object.keys(en).length).toBeGreaterThan(500);
  });
});
