import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import ar from "../src/i18n/ar.json";
import en from "../src/i18n/en.json";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const report = read("src/routes/Report.tsx");
const scan = read("src/routes/Scan.tsx");
const css = read("src/styles/index.css");
const tokens = read("src/styles/tokens.css");

/**
 * P1-3. Measured: «أرسل البلاغ» stayed disabled because «ماذا حدث؟» was
 * mandatory even with the message attached, «الجهة المنتحلة» stayed empty
 * although the verdict had extracted it, and «ابتزاز إلكتروني» sat off the
 * edge of a scrolling rail with nothing to say it was there.
 */
describe("a report from a verdict takes taps, not typing", () => {
  it("carries what the verdict already knew", () => {
    for (const field of ["category:", "messageText:", "entity:", "channel:"]) {
      expect(scan, `the prefill drops ${field}`).toContain(field);
    }
    // The App hands this on; a narrower type there would typecheck and still
    // silently drop the optional halves.
    expect(read("src/App.tsx")).toMatch(/interface Prefill \{/);
    expect(read("src/App.tsx")).toMatch(/\(next: Prefill\) => \{/);
  });

  it("lands on the right channel when the chip already said so", () => {
    // The only inference available, and it is not really one: «رقم هاتف» is a
    // call. Nothing in a verdict distinguishes SMS from WhatsApp, so it does
    // not guess at those.
    expect(scan).toContain('channel: type === "call" ? "call" : undefined');
    expect(report).toContain('useState<Channel>(prefill?.channel ?? "sms")');
  });

  it("wraps every chip instead of hiding the last one off-screen", () => {
    expect(report).not.toContain("<ChipRow>");
    expect(report.match(/<ChipWrap>/g)).toHaveLength(2);
  });

  it("does not ask a frightened person to classify Jordanian jurisdiction", () => {
    // «الجهة المعنية» is information. Nothing ever read relevant_authority
    // back out of the database, so the report no longer sends one at all —
    // which is also the honest shape: DARA' routes nothing to anyone.
    // The payload, not the file: a comment explaining why the field is gone
    // is not the field. (It caught my own comment on the first run.)
    const payload = report.slice(report.indexOf("await sendReport({"), report.indexOf("});", report.indexOf("await sendReport({")));
    expect(payload).not.toContain("relevant_authority");
    expect(report).not.toContain('role="radio"');
    expect(report).toContain('t("report.who_handles")');
    // What it shows instead is the verified record, with its source and date.
    expect(report).toContain('<HelpLines only={["cybercrime_unit"]} />');
  });

  it("keeps both pilot sentences exactly as they are", () => {
    // The one the brief names, under the send button.
    expect(ar["rep.footer"]).toBe("يصل بلاغك إلى منصة درع (نسخة تجريبية)، لا إلى جهة رسمية.");
    // And the receipt's, which denies the forwarding outright.
    expect(ar["report.pilot_note"]).toContain("منصة درع");
    expect(ar["report.pilot_note"]).toContain("لم يُرسَل إلى أي جهة");
    // The new heading is information, and says so in the same breath.
    expect(ar["report.who_handles_sub"]).toContain("لا يُرسل إلى أي جهة");
    expect(en["report.who_handles_sub"]).toContain("not sent to any body");
  });
});

/**
 * P1-4. The flags existed — a 2px underline under a --red-soft fill that was
 * 1.17:1 from the card — and were invisible on a phone.
 */
describe("the flagged spans are seen, and say what they mean", () => {
  it("fills the span instead of underlining it", () => {
    const block = css.slice(css.indexOf("mark.flag {"), css.indexOf("}", css.indexOf("mark.flag {")));
    expect(block).toContain("background: var(--flag)");
    expect(block).not.toContain("text-decoration");
  });

  it("mixes the fill from the brand red rather than adding a colour", () => {
    // Every value here is #c40c29 over the surface it sits on. The palette has
    // one accent and this is still it.
    for (const name of ["--flag:", "--flag-on:"]) {
      expect(tokens.split(name).length, `${name} is missing a theme`).toBe(3);
    }
  });

  it("lights the reason when a span is tapped, and the reverse", () => {
    expect(scan).toContain("onSelect={setFlag}");
    expect(scan).toContain("aria-pressed={lit}");
    expect(css).toMatch(/mark\.flag\[aria-pressed="true"\],\s*\n\.flag-on \{/);
  });

  it("gives a tappable span a name a screen reader can use", () => {
    expect(scan).toContain('t("res.flag_aria")');
    for (const dict of [ar, en] as Record<string, string>[]) {
      expect(dict["res.flag_aria"]).toContain("{n}");
    }
  });
});
