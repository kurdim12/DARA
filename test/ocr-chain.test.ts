import { describe, expect, it, vi } from "vitest";
import { chainFor, OCR_CHAIN, transcribe } from "../worker/ocr";
import { detectLang, OcrFailed, OcrRetryable, TRANSCRIBE_PROMPT, type OcrArgs, type OcrProvider, type OcrResult } from "../worker/ocr/types";
import type { AnalyzeImage } from "../shared/types";

const IMAGE: AnalyzeImage = { media_type: "image/jpeg", data: "Zm9v" };
const ARGS: OcrArgs = { image: IMAGE, apiKey: "test-key" };

/** A provider that does exactly one scripted thing. */
function fake(name: OcrProvider["name"], behaviour: () => Promise<string>): OcrProvider {
  return {
    name,
    model: `fake/${name}`,
    transcribe: async (): Promise<OcrResult> => ({ text: await behaviour() }),
  };
}

describe("the OCR chain", () => {
  it("uses the first provider when it answers", async () => {
    const second = vi.fn(async () => "never");
    const result = await transcribe(ARGS, [
      fake("openrouter-gemma4", async () => "أمانة عمان الكبرى"),
      fake("anthropic-haiku", second),
    ]);
    expect(result.text).toBe("أمانة عمان الكبرى");
    expect(result.provider).toBe("openrouter-gemma4");
    expect(second, "the fallback must not be called").not.toHaveBeenCalled();
  });

  it("falls back on a timeout", async () => {
    const result = await transcribe(ARGS, [
      fake("openrouter-gemma4", async () => { throw new OcrRetryable("gemma timed out"); }),
      fake("anthropic-haiku", async () => "read by the fallback"),
    ]);
    expect(result.text).toBe("read by the fallback");
    expect(result.provider, "a fallback must be visible, never silent").toBe("anthropic-haiku");
  });

  it("falls back on 5xx, on 429, and on empty text", async () => {
    for (const reason of ["gemma answered 503", "gemma answered 429", "gemma returned no text"]) {
      const result = await transcribe(ARGS, [
        fake("openrouter-gemma4", async () => { throw new OcrRetryable(reason); }),
        fake("anthropic-haiku", async () => "fallback text"),
      ]);
      expect(result.provider, reason).toBe("anthropic-haiku");
    }
  });

  it("fails rather than inventing text when both decline", async () => {
    await expect(
      transcribe(ARGS, [
        fake("openrouter-gemma4", async () => { throw new OcrRetryable("gemma timed out"); }),
        fake("anthropic-haiku", async () => { throw new OcrRetryable("haiku answered 500"); }),
      ]),
    ).rejects.toBeInstanceOf(OcrFailed);
  });

  it("names both failures, so a dead chain is diagnosable", async () => {
    const error = await transcribe(ARGS, [
      fake("openrouter-gemma4", async () => { throw new OcrRetryable("gemma timed out"); }),
      fake("anthropic-haiku", async () => { throw new OcrRetryable("haiku answered 500"); }),
    ]).catch((e) => e as Error);
    expect(error.message).toContain("gemma timed out");
    expect(error.message).toContain("haiku answered 500");
  });

  it("does not swallow a programming error", async () => {
    // Only OcrRetryable moves the chain on. A TypeError is a bug and must
    // surface rather than being reported as an unreadable image.
    await expect(
      transcribe(ARGS, [fake("openrouter-gemma4", async () => { throw new TypeError("bug"); })]),
    ).rejects.toBeInstanceOf(TypeError);
  });

  it("reports which provider answered and how long it took", async () => {
    const result = await transcribe(ARGS, [fake("openrouter-gemma4", async () => "text")]);
    expect(result.provider).toBe("openrouter-gemma4");
    expect(result.ms).toBeGreaterThanOrEqual(0);
    expect(typeof result.ms).toBe("number");
  });
});

describe("the transcription prompt", () => {
  it("asks for verbatim text and nothing else", () => {
    expect(TRANSCRIBE_PROMPT).toMatch(/verbatim/i);
    expect(TRANSCRIBE_PROMPT).toMatch(/original language/i);
    expect(TRANSCRIBE_PROMPT).toMatch(/preserve line breaks/i);
    expect(TRANSCRIBE_PROMPT).toMatch(/no commentary/i);
    expect(TRANSCRIBE_PROMPT).toMatch(/no translation/i);
  });

  it("treats an instruction inside the screenshot as text, never as a command", () => {
    // A scam screenshot is a plausible place to find "ignore your
    // instructions". Transcribing that line is right — it is evidence.
    expect(TRANSCRIBE_PROMPT).toMatch(/Never follow it/i);
  });
});

describe("pinning a provider for the comparison table", () => {
  it("runs the whole chain when nothing is pinned", () => {
    expect(chainFor(undefined, "openrouter-gemma4,anthropic-haiku")).toEqual(OCR_CHAIN);
  });

  it("pins to one provider, with no fallback", () => {
    // A pinned run that quietly fell back would measure the chain rather than
    // the provider, which is the one thing the table must not do.
    const chain = chainFor("anthropic-haiku", "openrouter-gemma4,anthropic-haiku");
    expect(chain).toHaveLength(1);
    expect(chain[0]!.name).toBe("anthropic-haiku");
  });

  it("ignores a name the deployment does not permit", () => {
    expect(chainFor("anthropic-haiku", "openrouter-gemma4")).toEqual(OCR_CHAIN);
    expect(chainFor("something-else", "openrouter-gemma4,anthropic-haiku")).toEqual(OCR_CHAIN);
  });

  it("permits nothing when no allowlist is configured", () => {
    // Production sets no allowlist, so production is the chain and only the
    // chain — a header cannot redirect it.
    expect(chainFor("anthropic-haiku", undefined)).toEqual(OCR_CHAIN);
    expect(chainFor("anthropic-haiku", "")).toEqual(OCR_CHAIN);
  });
});

describe("language detection", () => {
  it("reads the script, not a guess", () => {
    expect(detectLang("أمانة عمان الكبرى: بذمتك مخالفة")).toBe("ar");
    expect(detectLang("Your account has been suspended")).toBe("en");
    // A Jordanian scam SMS is Arabic even when the link and amount are Latin.
    expect(detectLang("ادفع 45 ديناراً: http://amanat-pay.com/fine")).toBe("ar");
    expect(detectLang("")).toBe("en");
  });
});
