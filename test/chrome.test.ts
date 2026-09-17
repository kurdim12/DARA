import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ar from "../src/i18n/ar.json";
import en from "../src/i18n/en.json";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const numbers = read("src/components/RadarNumbers.tsx");
const nav = read("src/components/BottomNav.tsx");
const shell = read("src/components/Shell.tsx");
const css = read("src/styles/index.css");

/**
 * P2-3. Measured: «6» and «6» side by side read as a duplication, the bars were
 * black with no axis, the 8-week chart was two bars in a wide flat gap, and
 * four cards each announced that they had no data.
 */
describe("the radar reads as a summary, not as an empty grid", () => {
  it("never shows the same count twice as two separate facts", () => {
    // A young platform that has had all its reports this week put the same
    // number in two cards. The week is a line under the platform count now.
    expect(numbers).toContain("week.total === radar.reports_total");
    expect(numbers).toContain('t("radar.stat_all_week")');
    expect(numbers).toContain("grid-cols-2");
    expect(numbers).not.toContain("grid-cols-3");
  });

  it("renders no block that has nothing in it", () => {
    // Four cells each saying "no data" is what made the page read as broken.
    expect(numbers).toMatch(/if \(rows === 0\) return null;/);
    for (const gone of ["radar.empty_top", "radar.empty_entities", "radar.empty_trend"]) {
      expect(numbers, `${gone} is still rendered`).not.toContain(gone);
    }
    // And says once, in a sentence, what is going on instead.
    expect(numbers).toContain('t("radar.low_data")');
    expect(numbers).toContain('t("radar.see_campaigns")');
  });

  it("draws its bars in the brand colour with a value on each", () => {
    expect(numbers).not.toMatch(/rounded-full bg-ink"/);
    expect(numbers.match(/bg-red/g)?.length, "bars are not brand red").toBeGreaterThanOrEqual(2);
    // The trend's value rides above its own bar rather than being inferred.
    expect(numbers).toMatch(/row\.count > 0 &&[\s\S]{0,200}\{row\.count\}/);
  });

  it("labels the time axis and says what is being counted", () => {
    expect(numbers).toContain('axis={t("radar.trend_axis")}');
    // Three labels across the full width, not eight cells each clipping one.
    expect(numbers).toContain("[0, middle, rows.length - 1]");
    expect(numbers).toContain("whitespace-nowrap");
  });

  it("still says out loud that this is not a national statistic", () => {
    expect(ar["radar.stat_note"]).toContain("ليست إحصاءً وطنياً");
    expect(en["radar.stat_note"]).toContain("Not a national statistic");
    expect(numbers).toContain('t("radar.stat_note")');
  });
});

/**
 * P2-4. The nav was welded to the screen edges and the header reserved 54px
 * for a notch that env(safe-area-inset-top) already accounts for.
 */
describe("the nav floats and the header is compact", () => {
  it("detaches the bar from all three edges, with the safe area respected", () => {
    expect(nav).toContain("paddingInline:");
    expect(nav).toContain("env(safe-area-inset-left)");
    expect(nav).toContain("var(--nav-gap) + env(safe-area-inset-bottom)");
    expect(nav).toMatch(/rounded-\[26px\]/);
    // And the page keeps that much clear below its last control.
    expect(css).toContain("--nav-total: calc(var(--nav-inner) + var(--nav-gap)");
  });

  it("blurs what scrolls under it, and stays readable where it cannot", () => {
    // A translucent bar with nothing blurring behind it is unreadable, so the
    // solid card colour is the floor and the blur is the enhancement.
    const block = css.slice(css.indexOf(".nav-bar {"), css.indexOf("}", css.indexOf("backdrop-filter: blur")));
    expect(block).toContain("background: var(--card)");
    expect(block).toContain("@supports (backdrop-filter");
  });

  it("gives the scan button an icon that matches what it opens", () => {
    // It was a scan frame on a button that opens a form you paste into.
    expect(nav).not.toContain("ScanLine");
    expect(nav).toContain('{ route: "scan", label: "nav.scan", Icon: Search }');
  });

  it("sticks the header to the top on the page's own colour", () => {
    expect(shell).toMatch(/sticky top-0 z-20/);
    expect(shell).toContain("bg-paper");
    // Never a red header background.
    const header = shell.slice(shell.indexOf("export function Header"), shell.indexOf("function useScrolled"));
    expect(header).not.toMatch(/bg-red/);
  });

  it("drops the 54px notch reserve and draws its hairline only on scroll", () => {
    expect(shell).not.toContain("max(54px, env(safe-area-inset-top))");
    expect(shell).toContain("calc(env(safe-area-inset-top) + 12px)");
    expect(shell).toContain('scrolled ? "border-b border-line" : "border-b border-transparent"');
    expect(shell).toMatch(/window\.scrollY > 4/);
  });

  it("carries the mark on a screen that has no back arrow", () => {
    expect(shell).toContain("{!onBack && <LogoTile />}");
  });
});
