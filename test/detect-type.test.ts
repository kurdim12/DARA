import { describe, expect, it } from "vitest";
import { detectType } from "../src/lib/detect";

/**
 * The chip is a guess from the shape of what was pasted, so someone does not
 * have to classify their own problem before asking about it. It is only ever
 * a suggestion: null means "leave whatever they chose alone", which is the
 * right answer for prose — and prose is most messages.
 */
describe("detectType", () => {
  it("reads a link", () => {
    for (const value of [
      "http://amanat-amman-pay.com/fine",
      "https://example.com",
      "www.example.com",
      "arabbank-secure.verify-now.com",
      "example.com/path?q=1",
    ]) {
      expect(detectType(value), value).toBe("link");
    }
  });

  it("reads a phone number, Jordanian or international", () => {
    for (const value of ["0791234567", "+962791234567", "+962 79 123 4567", "06-580-0500", "(079) 123-4567"]) {
      expect(detectType(value), value).toBe("call");
    }
  });

  it("reads Arabic-Indic digits as a phone number too", () => {
    // Someone pasting from an Arabic keyboard is still pasting a number.
    expect(detectType("٠٧٩١٢٣٤٥٦٧")).toBe("call");
  });

  it("leaves prose alone rather than guessing", () => {
    for (const value of [
      "أمانة عمان الكبرى: بذمتك مخالفة مرورية غير مدفوعة. ادفع خلال 24 ساعة: http://amanat-pay.com",
      "Your account has been suspended, click here",
      "عندي صورك الخاصة",
      "",
      "   ",
    ]) {
      expect(detectType(value), JSON.stringify(value)).toBeNull();
    }
  });

  it("does not mistake a short number or a word for either", () => {
    // Six digits is an OTP, not a phone number.
    expect(detectType("482913")).toBeNull();
    expect(detectType("hello")).toBeNull();
  });
});
