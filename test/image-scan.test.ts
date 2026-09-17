import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { ENGINE_IMAGE_TIMEOUT_MS, ENGINE_TIMEOUT_MS } from "../worker/engine/analyze";

/**
 * A screenshot scan measured 7.9s-13.4s end to end across six live fixtures on
 * a datacentre connection. Every ceiling here is set against those numbers,
 * and the ordering between them is the point: the Worker gives up first and
 * answers with a reason, and the client's timer is only the backstop for a
 * request that never gets an answer at all.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the screenshot path", () => {
  const api = read("src/lib/api.ts");

  it("gives the screenshot verdict a smaller wall than a standalone text one", () => {
    // It used to be larger, because one call read the picture AND judged it.
    // OCR does the reading now, so this covers only the judging — and unlike
    // a text scan it shares its budget with OCR.
    expect(ENGINE_IMAGE_TIMEOUT_MS).toBeLessThan(ENGINE_TIMEOUT_MS);
  });

  it("gives a text scan a wall the measured worst case clears easily", () => {
    // Ten live link scans ran 7,201-9,451ms. The old 10s wall left 549ms of
    // headroom on the slowest and lost one of the ten to a 504.
    expect(ENGINE_TIMEOUT_MS).toBeGreaterThan(9_451 * 2);
  });

  it("keeps the screenshot wall clear of the measured worst case", () => {
    // The engine only judges text now, and the slowest measured text verdict
    // was 9,451ms.
    expect(ENGINE_IMAGE_TIMEOUT_MS).toBeGreaterThanOrEqual(15_000);
  });

  it("keeps the client's text ceiling above the Worker's text wall", () => {
    const ceiling = Number(api.match(/const TEXT_CEILING_MS = ([\d_]+);/)?.[1].replace(/_/g, ""));
    expect(ceiling).toBeGreaterThan(ENGINE_TIMEOUT_MS);
  });

  it("applies the longer wall to transcribed text, not to an attached image", () => {
    // The regression this pins: the wall used to test `args.image`, which is
    // never set now that OCR reads the picture. Every screenshot silently got
    // the 10s text wall and 8 of 20 comparison runs timed out.
    const engine = read("worker/engine/analyze.ts");
    expect(engine).toMatch(/args\.image \|\| args\.fromScreenshot \? ENGINE_IMAGE_TIMEOUT_MS/);
  });

  it("fits OCR and the verdict inside the client's ceiling", () => {
    const worker = read("worker/index.ts");
    const ocr = Number(worker.match(/const OCR_WALL_MS = ([\d_]+);/)?.[1].replace(/_/g, ""));
    const ceiling = Number(api.match(/const IMAGE_CEILING_MS = ([\d_]+);/)?.[1].replace(/_/g, ""));
    expect(ocr + ENGINE_IMAGE_TIMEOUT_MS).toBeLessThan(ceiling);
  });

  it("aborts a screenshot request that never answers", () => {
    // It used to build an AbortController and never abort it, so a stalled
    // connection left a spinner with no end and no message.
    const branch = api.slice(api.indexOf("if (image) {"), api.indexOf("const fallback ="));
    expect(branch).toMatch(/setTimeout\(\(\) => controller\.abort\(\), IMAGE_CEILING_MS\)/);
    expect(branch).toMatch(/clearTimeout\(timer\)/);
    expect(branch).toMatch(/error\.image_slow/);
  });

  it("puts the client backstop above the Worker's own wall", () => {
    const ceiling = Number(api.match(/const IMAGE_CEILING_MS = ([\d_]+);/)?.[1].replace(/_/g, ""));
    expect(ceiling).toBeGreaterThan(ENGINE_IMAGE_TIMEOUT_MS);
  });

  it("has wording for the slow-image case in both languages", () => {
    for (const dict of ["src/i18n/ar.json", "src/i18n/en.json"]) {
      expect(JSON.parse(read(dict))["error.image_slow"], dict).toBeTruthy();
    }
  });

  it("reports what a call consumed, so cost is measured not guessed", () => {
    expect(read("worker/engine/analyze.ts")).toMatch(/usage: \{ input_tokens: number; output_tokens: number \}/);
    expect(read("worker/index.ts")).toContain("usage: result.usage");
  });
});
