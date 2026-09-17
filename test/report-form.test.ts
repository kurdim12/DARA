import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ar from "../src/i18n/ar.json";
import en from "../src/i18n/en.json";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const report = read("src/routes/Report.tsx");

/**
 * The report form is taps only. Nobody types a paragraph of Arabic on a stage
 * with a jury watching, and the two free-text boxes — «الجهة المنتحلة» and
 * «ماذا حدث؟» — were the only things between opening the tab and holding a
 * case number.
 */
describe("the report form asks for no typing", () => {
  it("has no text input or textarea left on it", () => {
    expect(report).not.toMatch(/<textarea/);
    expect(report).not.toMatch(/<input\s+type="text"/);
  });

  it("has dropped the wording for both fields from both dictionaries", () => {
    for (const key of ["rep.entity", "rep.entity_ph", "report.what_label", "report.what_ph"]) {
      expect(key in ar, `ar still carries ${key}`).toBe(false);
      expect(key in en, `en still carries ${key}`).toBe(false);
    }
  });

  it("never disables the send button on a length nobody can reach any more", () => {
    // The gate was description.trim().length < 20. With no description field
    // that is permanently true, which would have left the button dead.
    const block = report.slice(report.indexOf("<PrimaryButton"), report.indexOf("</PrimaryButton>"));
    expect(block).not.toMatch(/disabled=/);
  });
});

describe("what a report still carries", () => {
  it("takes the impersonated entity from the scan instead of a typed box", () => {
    // The Radar's «الجهة المنتحلة» chart reads impersonated_entity off the
    // reports table. Nobody types one now, so the scan that already worked it
    // out passes it through — better data, and no taps.
    expect(read("src/routes/Scan.tsx")).toMatch(/entity: result\.impersonated_entity \?\? undefined/);
    expect(report).toMatch(/impersonated_entity: entity \|\| undefined/);
  });

  it("still attaches the scanned message when the toggle is on", () => {
    expect(report).toMatch(/message_text: attach \? prefill\?\.messageText : undefined/);
  });

  it("sends no description field at all", () => {
    // The column is nullable, and the community feed selects only seeded rows
    // (is_public is never settable from a submission), so nothing downstream
    // breaks on its absence.
    expect(report).not.toMatch(/description: /);
  });
});
