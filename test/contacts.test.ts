import { describe, expect, it } from "vitest";
import { contacts } from "../src/lib/verified";
import file from "../content/verified.json";

/**
 * An emergency app that prints the wrong number is worse than one that prints
 * none, so these are the rules the Shield screen depends on.
 */
describe("contacts", () => {
  it("hides every number while nobody has verified it", () => {
    for (const lang of ["ar", "en"] as const) {
      for (const row of contacts(lang)) {
        const raw = file.contacts.find((c) => c.id === row.id)!;
        if (!raw.verified) {
          expect(row.number, `${row.id} leaked a number`).toBeNull();
          expect(row.extensions, `${row.id} leaked an extension`).toEqual([]);
        }
      }
    }
  });

  it("every contact still has a name to show while its number is hidden", () => {
    for (const lang of ["ar", "en"] as const) {
      for (const row of contacts(lang)) {
        expect(row.label.trim().length, `${row.id} has no ${lang} label`).toBeGreaterThan(0);
      }
    }
  });

  it("holds extensions apart from the number they belong to", () => {
    // 196 then 812594. Glued together that is 196812594, which nobody answers —
    // so the shape has to survive the trip from JSON to the screen.
    const unit = file.contacts.find((c) => c.id === "cybercrime_unit")!;
    expect(unit.number).not.toMatch(/\d{6,}/);
    expect((unit as { extensions?: string[] }).extensions ?? []).not.toHaveLength(0);
  });

  it("does not carry a number the file itself calls unconfirmed as verified", () => {
    // The whole file is a staging area. If this ever fails it means someone
    // flipped a flag — which is allowed, but only Abdelrahman may do it, and it
    // should be a deliberate commit rather than a surprise in a diff.
    const flipped = file.contacts.filter((c) => c.verified).map((c) => c.id);
    expect(flipped).toEqual([]);
  });
});
