import { describe, expect, it } from "vitest";
import { findQuoteSpan, normalize } from "../worker/lib/arabic";

describe("normalize", () => {
  it("drops diacritics and tatweel", () => {
    expect(normalize("مَرْحَبــــاً")).toBe("مرحبا");
  });

  it("collapses whitespace runs", () => {
    expect(normalize("a  \n  b")).toBe("a b");
  });

  it("folds Arabic-Indic digits onto Latin", () => {
    expect(normalize("٥٠٠٠")).toBe("5000");
  });
});

describe("findQuoteSpan", () => {
  const message =
    "عزيزي العميل، تم تعليق حساب البنك العربي مؤقتاً. انقر هنا للتحقق: http://arabbank-secure.verify-now.com";

  it("locates an exact quote and returns offsets into the original", () => {
    const span = findQuoteSpan(message, "تم تعليق حساب البنك العربي");
    expect(span).not.toBeNull();
    expect(message.slice(span!.start, span!.end)).toBe("تم تعليق حساب البنك العربي");
  });

  it("matches through added diacritics", () => {
    const span = findQuoteSpan(message, "انقُر هنا للتحقق");
    expect(span).not.toBeNull();
    expect(message.slice(span!.start, span!.end)).toBe("انقر هنا للتحقق");
  });

  it("matches through re-spacing", () => {
    const span = findQuoteSpan(message, "انقر   هنا");
    expect(span).not.toBeNull();
    expect(message.slice(span!.start, span!.end)).toBe("انقر هنا");
  });

  it("matches a URL case-insensitively", () => {
    const span = findQuoteSpan(message, "HTTP://ArabBank-Secure.Verify-Now.com");
    expect(span).not.toBeNull();
  });

  it("returns null for a quote that is not in the message", () => {
    expect(findQuoteSpan(message, "أرسل رقم بطاقتك")).toBeNull();
  });

  it("returns null for an empty quote", () => {
    expect(findQuoteSpan(message, "   ")).toBeNull();
  });

  it("keeps offsets correct when the message starts with whitespace", () => {
    const padded = "\n\n  تحويل 300 دينار";
    const span = findQuoteSpan(padded, "300 دينار");
    expect(span).not.toBeNull();
    expect(padded.slice(span!.start, span!.end)).toBe("300 دينار");
  });
});
