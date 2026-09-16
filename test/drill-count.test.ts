import { describe, expect, it } from "vitest";
import quiz from "../content/quiz.json";
import en from "../src/i18n/en.json";
import ar from "../src/i18n/ar.json";

/**
 * The tile that opens the drill states how many messages are in it, and the
 * reference build's own copy said three where this one has six. A number in
 * the copy that nothing checks is a number that drifts, and rule 4 says the
 * app does not invent statistics — including about itself.
 */
const WORDS_EN: Record<number, string> = {
  3: "Three", 4: "Four", 5: "Five", 6: "Six", 7: "Seven", 8: "Eight",
};
const WORDS_AR: Record<number, string> = {
  3: "ثلاث", 4: "أربع", 5: "خمس", 6: "ست", 7: "سبع", 8: "ثماني",
};

describe("the drill's copy counts the drill", () => {
  const count = quiz.questions.length;

  it("has a countable drill", () => {
    expect(count).toBeGreaterThan(2);
    expect(WORDS_EN[count]).toBeDefined();
  });

  it("English says how many there are", () => {
    expect(en["ft.home.tool_train_sub"]).toContain(WORDS_EN[count]);
  });

  it("Arabic says how many there are", () => {
    expect(ar["ft.home.tool_train_sub"]).toContain(WORDS_AR[count]);
  });
});
