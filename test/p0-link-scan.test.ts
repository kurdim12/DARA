import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { inspectTextSignals, preliminaryVerdict, SIGNAL_REASON } from "../worker/engine/heuristics";
import { preliminaryResponse } from "../worker/engine/preliminary";
import { inspectText } from "../worker/engine/url";
import { ENGINE_TIMEOUT_MS } from "../worker/engine/analyze";

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

/**
 * P0-1. Ten live link scans measured 7,201-9,451ms against a 10s wall: the
 * slowest had 549ms of headroom and one of the ten came back as a 504 with
 * «تعذّر إكمال الفحص» and nothing else.
 *
 * Two things fix that. The wall is no longer a coin toss, and a failure is no
 * longer a dead end — the local signals answer instead, tagged.
 */
describe("the local signals", () => {
  it("quotes only what is literally in the text", () => {
    const text = "معك قسم الاحتيال في البنك. رح يوصلك رمز التحقق على هاتفك، اقرأه لي فوراً.";
    for (const signal of inspectTextSignals(text)) {
      expect(text).toContain(signal.quote);
      expect(text.slice(signal.start, signal.end)).toBe(signal.quote);
    }
  });

  it("reads an OTP request as one", () => {
    const found = inspectTextSignals("رح يوصلك رمز التحقق على هاتفك، اقرأه لي");
    expect(found.map((s) => s.code)).toContain("asks_for_otp");
  });

  it("reads a deadline and a payment demand", () => {
    const found = inspectTextSignals("ادفع خلال 24 ساعة لتجنب مضاعفة الغرامة");
    const codes = found.map((s) => s.code);
    expect(codes).toContain("deadline_pressure");
    expect(codes).toContain("demands_payment");
  });

  it("says nothing about ordinary text", () => {
    expect(inspectTextSignals("شحنتك في طريقها إليك وسيتم التسليم اليوم.")).toHaveLength(0);
  });

  it("never claims the engine's confidence", () => {
    // Everything here is pattern matching. It cannot read tone and cannot
    // tell a warning about a scam from the scam, so it must never look as
    // certain as something that read the message.
    const worst = preliminaryVerdict(
      "مبروك! فزت بجائزة. حوّل 50 دينار رسوم خلال 24 ساعة وأرسل رمز التحقق ولا تخبر أحد.",
      inspectText("http://1.2.3.4/win"),
    );
    expect(worst.verdict).toBe("scam");
    expect(worst.confidence).toBeLessThanOrEqual(60);
  });
});

describe("the preliminary answer", () => {
  const url = inspectText("http://arabbank-secure.verify-now.com");

  it("is a usable verdict, not an error", () => {
    const out = preliminaryResponse("انقر هنا للتحقق وحدّث بياناتك فوراً", url, "ar", false);
    expect(out).not.toBeNull();
    expect(out!.verdict).toBeTruthy();
    expect(out!.preliminary).toBe(true);
  });

  it("says in its own headline that the server was not reached", () => {
    const ar = preliminaryResponse("حدّث بياناتك فوراً", url, "ar", false);
    const en = preliminaryResponse("update your details immediately", url, "en", false);
    expect(ar!.headline).toContain("تعذّر الوصول");
    expect(en!.headline.toLowerCase()).toContain("could not be reached");
  });

  it("never recommends filing a report on a partial read", () => {
    expect(preliminaryResponse("حدّث بياناتك فوراً", url, "ar", false)!.report_recommended).toBe(false);
  });

  it("keeps every flagged span inside the text it was given", () => {
    const text = "ادفع خلال 24 ساعة وأرسل رمز التحقق";
    const out = preliminaryResponse(text, null, "ar", false)!;
    for (const flag of out.red_flags) {
      expect(text.slice(flag.start, flag.end)).toBe(flag.quote);
    }
  });

  it("returns nothing rather than guessing 'looks safe'", () => {
    // A confident all-clear from pattern matching alone is the one error
    // that is dangerous, so this path declines instead.
    expect(preliminaryResponse("شكراً لك، وصلني الطلب.", null, "ar", false)).toBeNull();
  });

  it("has wording for every signal, in both languages", () => {
    const ar = JSON.parse(read("src/i18n/ar.json"));
    const en = JSON.parse(read("src/i18n/en.json"));
    const out = preliminaryResponse(
      "مبروك! فزت. حوّل 50 دينار خلال 24 ساعة وأرسل رمز التحقق ولا تخبر أحد.",
      url,
      "ar",
      false,
    )!;
    for (const flag of out.red_flags) {
      expect(ar[flag.why], `ar is missing ${flag.why}`).toBeTruthy();
      expect(en[flag.why], `en is missing ${flag.why}`).toBeTruthy();
    }
  });
});

describe("the wiring", () => {
  const worker = read("worker/index.ts");

  it("answers from the cache before asking the model", () => {
    const cacheAt = worker.indexOf("await cachedScan(");
    const engineAt = worker.indexOf("await runEngine(");
    expect(cacheAt).toBeGreaterThan(-1);
    expect(cacheAt).toBeLessThan(engineAt);
  });

  it("awaits the cache write instead of firing and forgetting", () => {
    // A Worker can be torn down the moment it responds; an un-awaited write
    // loses that race and the cache silently never fills.
    expect(worker).toMatch(/await storeScan\(/);
  });

  it("never caches a preliminary answer", () => {
    // Otherwise a degraded result is served for 24 hours after the outage
    // that caused it has ended.
    expect(read("worker/engine/cache.ts")).toMatch(/if \(body\.preliminary\) return;/);
  });

  it("falls back to the local signals instead of a dead end", () => {
    expect(worker).toMatch(/const fallback = preliminaryResponse\(/);
    // The bare error survives only for the case where there is nothing to say.
    expect(worker).toMatch(/if \(reason === "timeout"\) return c\.json\(\{ error: "timeout" \}, 504\)/);
  });

  it("gives the model a wall it clears twice over", () => {
    expect(ENGINE_TIMEOUT_MS).toBeGreaterThan(9_451 * 2);
  });
});

describe("the waiting and failure UI", () => {
  const card = read("src/components/ScanInputCard.tsx");

  it("shows the failure inside the card, with a retry that resubmits", () => {
    expect(card).toContain('t("error.title")');
    expect(card).toContain('t("scan.retry")');
    // The retry calls the same submit handler, so it resends the same content.
    const block = card.slice(card.indexOf("{failure && !busy"), card.indexOf("{busy && <ScanProgress"));
    expect(block).toMatch(/onClick=\{onSubmit\}/);
  });

  it("shows staged progress rather than a bare spinner", () => {
    const progress = read("src/components/ScanProgress.tsx");
    for (const key of ["scan.stage_read", "scan.stage_domain", "scan.stage_analyze"]) {
      expect(progress).toContain(key);
    }
    expect(card).toContain("{busy && <ScanProgress />}");
  });

  it("respects reduced motion", () => {
    const css = read("src/styles/index.css");
    const block = css.slice(css.lastIndexOf("@media (prefers-reduced-motion"));
    expect(block).toContain(".spin");
    expect(block).toContain("animation: none");
  });

  it("tags a preliminary result on the verdict band", () => {
    const scan = read("src/routes/Scan.tsx");
    expect(scan).toContain('t(result.preliminary ? "prelim.tag" : "res.saved")');
    expect(scan).toContain('t("prelim.note")');
  });
});

describe("the preliminary reasons reach the reader as sentences", () => {
  it("translates a flag's why instead of printing the key at them", () => {
    // preliminaryResponse stores an i18n key in `why` — the engine stores a
    // sentence. The result screen rendered `{item.why}` raw, so a fallback
    // verdict printed "prelim.payment" into «لماذا» on a 375px phone. t()
    // falls through to the raw string for an unknown key, so one call is
    // correct for both paths.
    const scan = read("src/routes/Scan.tsx");
    expect(scan).toContain("{t(item.why as TextKey)}");
    expect(scan).not.toMatch(/\{item\.why\}/);
  });

  it("has every preliminary reason worded in both dictionaries", () => {
    const ar = JSON.parse(read("src/i18n/ar.json"));
    const en = JSON.parse(read("src/i18n/en.json"));
    for (const key of Object.values(SIGNAL_REASON)) {
      expect(ar[key], `ar is missing ${key}`).toBeTruthy();
      expect(en[key], `en is missing ${key}`).toBeTruthy();
    }
  });
});
