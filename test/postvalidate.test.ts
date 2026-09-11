import { describe, expect, it } from "vitest";
import { postValidate } from "../worker/engine/postvalidate";

const MESSAGE =
  "تهانينا! رقمك فاز بـ 5000 دينار. أرسل تفاصيل حسابك البنكي خلال 24 ساعة.";

function base(overrides: Record<string, unknown> = {}) {
  return {
    verdict: "scam",
    confidence: 96,
    category: "fake_prize",
    impersonated_entity: null,
    headline: "رسالة احتيال.",
    red_flags: [],
    actions: [],
    report_recommended: true,
    route_to_shield: false,
    ...overrides,
  };
}

describe("postValidate", () => {
  it("keeps a flag whose quote is in the message and computes offsets", () => {
    const out = postValidate(
      base({ red_flags: [{ quote: "رقمك فاز بـ 5000 دينار", why: "لم تشارك." }] }),
      MESSAGE,
    );
    expect(out.red_flags).toHaveLength(1);
    expect(MESSAGE.slice(out.red_flags[0]!.start, out.red_flags[0]!.end)).toBe(
      "رقمك فاز بـ 5000 دينار",
    );
    expect(out.stats.dropped_unmatched).toBe(0);
  });

  it("drops a flag the engine invented", () => {
    const out = postValidate(
      base({ red_flags: [{ quote: "أرسل رقم بطاقتك الائتمانية", why: "…" }] }),
      MESSAGE,
    );
    expect(out.red_flags).toHaveLength(0);
    expect(out.stats.dropped_unmatched).toBe(1);
  });

  it("drops a second flag that overlaps the first", () => {
    const out = postValidate(
      base({
        red_flags: [
          { quote: "رقمك فاز بـ 5000 دينار", why: "أ" },
          { quote: "فاز بـ 5000", why: "ب" },
        ],
      }),
      MESSAGE,
    );
    expect(out.red_flags).toHaveLength(1);
    expect(out.stats.dropped_overlap).toBe(1);
  });

  it("caps confidence for likely_safe at 90", () => {
    const out = postValidate(
      base({ verdict: "likely_safe", confidence: 99, category: "none" }),
      MESSAGE,
    );
    expect(out.confidence).toBe(90);
  });

  it("clamps confidence into range", () => {
    expect(postValidate(base({ confidence: 140 }), MESSAGE).confidence).toBe(100);
    expect(postValidate(base({ confidence: -5 }), MESSAGE).confidence).toBe(0);
  });

  it("removes an action that invents a phone number", () => {
    const out = postValidate(
      base({
        actions: ["اتصل بالبنك على 0791234567", "لا ترسل أي بيانات."],
      }),
      MESSAGE,
    );
    expect(out.actions).toEqual(["لا ترسل أي بيانات."]);
    expect(out.stats.dropped_actions).toBe(1);
  });

  it("removes an action that invents a URL", () => {
    const out = postValidate(
      base({ actions: ["افتح https://dara-help.example.com", "احذف الرسالة."] }),
      MESSAGE,
    );
    expect(out.actions).toEqual(["احذف الرسالة."]);
  });

  it("keeps an action quoting a number that is in the message", () => {
    const out = postValidate(
      base({ actions: ["تجاهل وعد الـ 5000 دينار.", "احذف الرسالة."] }),
      MESSAGE,
    );
    expect(out.actions).toHaveLength(2);
  });

  it("drops a phone number stitched together from unrelated numbers in the message", () => {
    // 079123 + 4567 + 24 concatenated contains 0791234567, which appears nowhere.
    const message = "طلبك رقم 079123 بقيمة 4567 دينار، ادفع خلال 24 ساعة";
    const out = postValidate(
      base({ actions: ["اتصل على 0791234567 للتأكد", "احذف الرسالة."] }),
      message,
    );
    expect(out.actions).toEqual(["احذف الرسالة."]);
    expect(out.stats.dropped_actions).toBe(1);
  });

  it("keeps a phone number that really is in the message, however it is spaced", () => {
    const message = "للاستفسار اتصل على 079 123 4567 خلال ساعات الدوام.";
    const out = postValidate(
      base({ actions: ["تحقق من الرقم 0791234567 قبل أن ترد.", "احذف الرسالة."] }),
      message,
    );
    expect(out.actions).toHaveLength(2);
  });

  it("keeps an action quoting the message's own URL before an Arabic comma", () => {
    const message = "ادخل الرابط https://bank-secure.example.com/verify لتأكيد حسابك";
    const out = postValidate(
      base({
        actions: [
          "لا تفتح https://bank-secure.example.com/verify، واحذف الرسالة",
          "احذف الرسالة.",
        ],
      }),
      message,
    );
    expect(out.actions).toHaveLength(2);
    expect(out.stats.dropped_actions).toBe(0);
  });

  it("forces the Shield route for extortion", () => {
    const out = postValidate(
      base({ category: "extortion", route_to_shield: false }),
      MESSAGE,
    );
    expect(out.route_to_shield).toBe(true);
  });

  it("rejects an unusable verdict rather than guessing", () => {
    expect(() => postValidate(base({ verdict: "definitely_bad" }), MESSAGE)).toThrow();
  });

  it("rejects an empty headline", () => {
    expect(() => postValidate(base({ headline: "  " }), MESSAGE)).toThrow();
  });

  it("keeps at most four flags and at most three actions", () => {
    const out = postValidate(
      base({
        red_flags: [
          { quote: "تهانينا", why: "1" },
          { quote: "رقمك فاز", why: "2" },
          { quote: "أرسل تفاصيل حسابك البنكي", why: "3" },
          { quote: "خلال 24 ساعة", why: "4" },
          { quote: "دينار", why: "5" },
        ],
        actions: ["أ.", "ب.", "ج.", "د."],
      }),
      MESSAGE,
    );
    expect(out.red_flags.length).toBeLessThanOrEqual(4);
    expect(out.actions).toHaveLength(3);
  });
});
