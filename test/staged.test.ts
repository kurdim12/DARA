import { describe, expect, it } from "vitest";
import staged from "../src/demo/staged.json";
import { stagedFromGoldenSet } from "../scripts/stage-demo.mjs";

describe("src/demo/staged.json", () => {
  it("matches the golden set's demo cases — run `npm run demo:stage` if this fails", async () => {
    expect(staged).toEqual(await stagedFromGoldenSet());
  });

  it("never ships a case whose text is still the placeholder", () => {
    for (const entry of staged as { text: string }[]) {
      expect(entry.text).not.toContain("REPLACE_WITH_EXACT_SMS_TEXT");
    }
  });
});
