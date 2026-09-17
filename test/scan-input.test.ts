import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";

/**
 * One input card, on Home and on فحص, so the two screens cannot drift into
 * two different ideas of how you check something.
 *
 * The ordering rule this pins is the whole point of the pass: enter → review
 * → scan. Paste fills the field; it does not scan. Home used to read the
 * clipboard and submit it in one press, which meant the only way to see what
 * was about to be sent was to watch it go.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the scan input card", () => {
  const card = read("src/components/ScanInputCard.tsx");

  it("is the only input, on both screens", () => {
    for (const route of ["src/routes/Home.tsx", "src/routes/Scan.tsx"]) {
      expect(read(route), `${route} uses the shared card`).toContain("<ScanInputCard");
    }
    // The component it replaced is gone, not left behind to drift.
    expect(existsSync(new URL("../src/components/ScannerCard.tsx", import.meta.url))).toBe(false);
  });

  it("never scans from a paste", () => {
    const paste = card.slice(card.indexOf("async function paste()"), card.indexOf("async function pick("));
    expect(paste).toContain("fill(clip)");
    expect(paste, "paste must not submit").not.toMatch(/onSubmit|run\(/);
  });

  it("only reads the clipboard from a tap", () => {
    // Not on mount, not in an effect — from the handler and nowhere else.
    expect(card).not.toMatch(/useEffect/);
    expect(card.match(/readClipboardText\(\)/g)).toHaveLength(1);
    expect(card).toMatch(/onClick=\{\(\) => void paste\(\)\}/);
  });

  it("ties a visible label to the field", () => {
    expect(card).toMatch(/htmlFor=\{fieldId\}/);
    expect(card).toMatch(/id=\{fieldId\}/);
    // The label is no longer one fixed string: it follows the chip, so it is
    // read out of TYPE_META alongside the placeholder.
    expect(card).toContain("t(TYPE_META[type].field)");
  });

  it("puts the chips above the field, and lets them wrap", () => {
    expect(card.indexOf("<TypeChips")).toBeLessThan(card.indexOf("<textarea"));
    expect(read("src/components/TypeChips.tsx")).toContain("wrap = true");
    expect(read("src/components/Shell.tsx")).toContain("export function ChipWrap");
  });

  it("carries a half-typed draft from Home into فحص", () => {
    const app = read("src/App.tsx");
    expect(app).toMatch(/next === "scan" && \(draft\.text\.trim\(\)\.length > 0 \|\| draft\.image\)/);
    // Carried for review, never run behind the person's back.
    expect(app).toMatch(/setSeed\(\{ text: draft\.text, run: false/);
  });

  it("keeps help text and nav labels at 13px or more", () => {
    for (const file of ["src/components/ScanInputCard.tsx", "src/components/BottomNav.tsx"]) {
      const hits = read(file).match(/text-\[1[0-2](\.\d+)?px\]/g);
      expect(hits, `${file} has text below 13px: ${hits?.join(", ")}`).toBeNull();
    }
  });
});
