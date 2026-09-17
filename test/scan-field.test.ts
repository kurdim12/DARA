import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ANALYSIS_TYPES } from "../shared/types";
import { TYPE_META } from "../src/components/TypeChips";
import ar from "../src/i18n/ar.json";
import en from "../src/i18n/en.json";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const card = read("src/components/ScanInputCard.tsx");
const tokens = read("src/styles/tokens.css");
const css = read("src/styles/index.css");

/** WCAG relative luminance, so the contrast claims in tokens.css are checked. */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const part = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * part(0) + 0.7152 * part(2) + 0.0722 * part(4);
}

function ratio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** The value of one custom property inside one theme block. */
function token(name: string, theme: "light" | "dark"): string {
  const start = theme === "light" ? tokens.indexOf(":root {") : tokens.indexOf(':root[data-theme="dark"]');
  const block = tokens.slice(start, tokens.indexOf("}", start));
  return block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i"))![1];
}

/**
 * P1-1. Measured on production: the field's surface was 1.06:1 from the card
 * it sat on and its border 1.26:1, with `outline-none` cancelling the app's
 * focus ring. On a phone that is not a field, it is a faint rectangle, and
 * focusing it changed nothing at all.
 */
describe("the scan field reads as a field", () => {
  it("draws its border at 3:1 or better against both surfaces it separates", () => {
    for (const theme of ["light", "dark"] as const) {
      const card = token("card", theme);
      const field = token("field", theme);
      const line = token("field-line", theme);
      expect(ratio(line, card), `${theme}: border vs card`).toBeGreaterThanOrEqual(3);
      expect(ratio(line, field), `${theme}: border vs field`).toBeGreaterThanOrEqual(3);
    }
  });

  it("has a focus ring visible in dark, where the brand red is not", () => {
    // #c40c29 is 2.85:1 on the dark card. A focus ring nobody can see is the
    // same as no focus ring, so dark gets a lightened red.
    for (const theme of ["light", "dark"] as const) {
      expect(ratio(token("focus", theme), token("card", theme)), theme).toBeGreaterThanOrEqual(3);
    }
  });

  it("gives the field a surface of its own, not the page's", () => {
    expect(card).toMatch(/className="field /);
    const tag = card.slice(card.indexOf("<textarea"), card.indexOf("/>", card.indexOf("<textarea")));
    expect(tag).not.toContain("bg-paper");
  });

  it("no longer cancels its own focus ring", () => {
    const block = card.slice(card.indexOf("<textarea"), card.indexOf("/>", card.indexOf("<textarea")));
    expect(block).not.toContain("outline-none");
    expect(css).toMatch(/\.field:focus[\s\S]*?box-shadow: 0 0 0 3px/);
  });

  it("offers a way to empty the field once there is something in it", () => {
    expect(card).toContain('t("scan.clear")');
    expect(card).toMatch(/onClick=\{\(\) => onText\(""\)\}/);
  });

  it("makes the screenshot option a row of its own that says what it does", () => {
    // It was a 36px outline pill beside «لصق», reading as the lesser of two
    // equals. It is the second way into the whole app.
    expect(card).toContain('t("scan.attach_sub")');
    const block = card.slice(card.indexOf("{!image && ("), card.indexOf('t("scan.consent")'));
    expect(block).toMatch(/min-h-14 w-full/);
  });
});

/**
 * P1-2. The dictionary had a placeholder per type and the code had the map,
 * but the field rendered one static string, so the chips looked decorative:
 * tapping «رقم هاتف» asked for «الصق رسالة أو رابطًا أو رقم هاتف…» as before.
 */
describe("the field follows the chip", () => {
  it("takes both its label and its placeholder from the type", () => {
    expect(card).toContain("t(TYPE_META[type].field)");
    expect(card).toContain("t(TYPE_META[type].placeholder)");
    expect(card).not.toContain('t("scan.input_ph")');
  });

  it("has a distinct label and placeholder for every type, in both languages", () => {
    const seen = new Set<string>();
    for (const type of ANALYSIS_TYPES) {
      const meta = TYPE_META[type];
      for (const key of [meta.label, meta.field, meta.placeholder]) {
        expect((ar as Record<string, string>)[key], `ar is missing ${key}`).toBeTruthy();
        expect((en as Record<string, string>)[key], `en is missing ${key}`).toBeTruthy();
      }
      // Two types that ask for the same thing in the same words are one type.
      expect(seen.has(meta.placeholder), `${type} shares a placeholder`).toBe(false);
      seen.add(meta.placeholder);
    }
  });

  it("asks for a phone number by showing its shape", () => {
    expect((ar as Record<string, string>)["scan.ph_call"]).toContain("07 9XXX XXXX");
    expect((en as Record<string, string>)["scan.ph_call"]).toContain("07 9XXX XXXX");
  });

  it("has folded «موقع» into «رابط أو موقع», leaving four chips", () => {
    expect(ANALYSIS_TYPES).toHaveLength(4);
    expect(ANALYSIS_TYPES).not.toContain("website");
    expect((ar as Record<string, string>)["type.link"]).toBe("رابط أو موقع");
    expect("type.website" in ar).toBe(false);
    expect("scan.ph_website" in ar).toBe(false);
  });
});
