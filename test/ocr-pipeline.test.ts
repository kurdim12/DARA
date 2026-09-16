import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The architecture the whole phase exists for: image → OCR → text pipeline.
 *
 * These read the wiring rather than run it, because running it means spending
 * real money at a real gateway. What they pin is the ordering and the
 * refusals — the parts that would silently rot back into "let the vision
 * model judge the picture".
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the screenshot pipeline", () => {
  const worker = read("worker/index.ts");

  it("transcribes before anything judges", () => {
    const ocrAt = worker.indexOf("await transcribe(");
    const engineAt = worker.indexOf("await runEngine(");
    const linkAt = worker.indexOf("inspectText(subject)");
    expect(ocrAt).toBeGreaterThan(-1);
    expect(ocrAt, "OCR must come before the link parser").toBeLessThan(linkAt);
    expect(ocrAt, "OCR must come before the engine").toBeLessThan(engineAt);
  });

  it("never hands the engine an image", () => {
    const call = worker.slice(worker.indexOf("await runEngine("), worker.indexOf("// The government-impersonation"));
    expect(call).not.toMatch(/^\s*image,$/m);
    expect(call).toContain("fromScreenshot: Boolean(transcript)");
  });

  it("judges the transcription, not the pasted text, when there is one", () => {
    expect(worker).toMatch(/const subject = transcript \? transcript\.text : text;/);
    expect(worker).toMatch(/text: subject,/);
  });

  it("answers ocr_failed rather than guessing a verdict", () => {
    expect(worker).toMatch(/if \(error instanceof OcrFailed\) return c\.json\(\{ error: "ocr_failed" \}, 422\)/);
    // An empty transcription is the same refusal, not an empty message.
    expect(worker).toMatch(/if \(subject\.length === 0\) return c\.json\(\{ error: "ocr_failed" \}, 422\)/);
  });

  it("reports ocr_ready on health", () => {
    expect(worker).toContain("ocr_ready: ocrReady(gatewayKey(c.env))");
  });

  it("uses the paid Gemma id, never a free variant", () => {
    const gemma = read("worker/ocr/gemma.ts");
    // Check the id itself, not the file: the comment above it explains why
    // the free tier is avoided and naturally contains the word.
    const id = gemma.match(/export const MODEL = "([^"]+)"/)?.[1];
    expect(id).toBe("google/gemma-4-31b-it");
    expect(id, "a :free id carries different data terms").not.toMatch(/:free$/);
  });

  it("sends the attribution headers OpenRouter asks for", () => {
    const gemma = read("worker/ocr/gemma.ts");
    expect(gemma).toContain('"HTTP-Referer"');
    expect(gemma).toContain('"X-Title": "DARA"');
    expect(gemma).toMatch(/max_tokens: 1200/);
    expect(gemma).toMatch(/temperature: 0/);
  });

  it("gives each provider 8 s and keeps the pair inside the wall", () => {
    expect(read("worker/ocr/types.ts")).toMatch(/OCR_TIMEOUT_MS = 8_000/);
    const wall = Number(worker.match(/const OCR_WALL_MS = ([\d_]+);/)?.[1].replace(/_/g, ""));
    // Two 8s attempts plus overhead, and still clear of the client's ceiling.
    expect(wall).toBeGreaterThanOrEqual(16_000);
    expect(wall).toBeLessThan(30_000);
  });
});

describe("the result screen", () => {
  const scan = read("src/routes/Scan.tsx");

  it("shows the transcription once, editable in place", () => {
    expect(scan).toContain('t("ocr.title")');
    expect(scan).toMatch(/onChange=\{\(e\) => setDraft\(e\.target\.value\)\}/);
    expect(scan).toContain('t("ocr.rescan")');
    expect(scan).toContain('t(editing ? "ocr.cancel" : "ocr.correct")');
    // One block, two modes. Printing the transcription and then the
    // highlighted copy of the same paragraph is the same text twice.
    expect(scan.match(/<HighlightedMessage/g), "the message renders once").toHaveLength(1);
  });

  it("leaves editing when a new result arrives", () => {
    // Otherwise the next scan opens straight into a textarea over text
    // nobody asked to correct.
    expect(scan).toMatch(/setDraft\(input\);\s*\n\s*setEditing\(false\);/);
  });

  it("re-checks corrected text without paying for OCR twice", () => {
    const rescan = scan.slice(scan.indexOf("onRescan={"), scan.indexOf("onAgain={"));
    expect(rescan, "the image is dropped, so OCR is not repeated").toContain("setImage(null)");
    expect(rescan).toMatch(/run\(corrected, undefined, null\)/);
  });

  it("points the flags at the text the engine actually judged", () => {
    // The transcription IS what was judged, so every quote it returned
    // exists inside it — which is why the underlines land.
    expect(scan).toMatch(/input: result\.extracted_text \|\| trimmed/);
  });

  it("has wording for an unreadable image in both languages", () => {
    for (const dict of ["src/i18n/ar.json", "src/i18n/en.json"]) {
      const d = JSON.parse(read(dict));
      expect(d["error.ocr_failed"], dict).toBeTruthy();
      expect(d["ocr.title"], dict).toBeTruthy();
      expect(d["ocr.rescan"], dict).toBeTruthy();
    }
  });
});
