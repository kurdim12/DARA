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

  it("gives an image call a longer wall than a text one", () => {
    expect(ENGINE_IMAGE_TIMEOUT_MS).toBeGreaterThan(ENGINE_TIMEOUT_MS);
  });

  it("keeps the image wall clear of the measured worst case", () => {
    // 13,400ms was the slowest of six live scans. A wall under that would cut
    // off scans that work — which is why the brief's proposed 12s was not
    // applied. See docs/image-scan/REPRO.md.
    expect(ENGINE_IMAGE_TIMEOUT_MS).toBeGreaterThan(13_400);
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
