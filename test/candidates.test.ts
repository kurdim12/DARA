import { describe, expect, it } from "vitest";
// @ts-expect-error — a plain .mjs script, imported here for its one pure function.
import { candidates } from "../scripts/candidates.mjs";

/**
 * The engine forces a named tool call on every scan and sends an image block
 * for screenshots. A model that cannot do both cannot serve this app, however
 * well it scores on a leaderboard — so the filter that decides what is worth
 * evaluating is worth pinning.
 */
const CATALOGUE = [
  {
    id: "google/gemini-3.8-flash",
    supported_parameters: ["tools", "tool_choice"],
    architecture: { input_modalities: ["text", "image"] },
    pricing: { prompt: "0.0000003", completion: "0.0000025" },
    context_length: 1_000_000,
  },
  {
    id: "openai/gpt-6-astra",
    supported_parameters: ["tools"],
    architecture: { input_modalities: ["text", "image"] },
    pricing: { prompt: "0.00000125", completion: "0.00001" },
  },
  {
    id: "vendor/text-only",
    supported_parameters: ["tools", "tool_choice"],
    architecture: { input_modalities: ["text"] },
    pricing: { prompt: "0.0000001", completion: "0.0000002" },
  },
  {
    id: "vendor/no-tools",
    supported_parameters: ["temperature"],
    architecture: { input_modalities: ["text", "image"] },
    pricing: { prompt: "0.0000001", completion: "0.0000002" },
  },
  { id: "vendor/no-fields" },
];

describe("candidates", () => {
  const rows = candidates(CATALOGUE);

  it("keeps only models that do both tools and images", () => {
    expect(rows.map((r: { id: string }) => r.id)).toEqual([
      "google/gemini-3.8-flash",
      "openai/gpt-6-astra",
    ]);
  });

  it("survives a catalogue entry with no pricing or modality fields", () => {
    expect(() => candidates(CATALOGUE)).not.toThrow();
  });

  it("converts per-token pricing to dollars per million", () => {
    expect(rows[0].in).toBeCloseTo(0.3, 6);
    expect(rows[0].out).toBeCloseTo(2.5, 6);
  });

  it("sorts cheapest input first", () => {
    expect(rows[0].in).toBeLessThan(rows[1].in);
  });

  it("flags a model that advertises tools but not forced tool choice", () => {
    // This is the Fable 5.1 trap generalised: tool support is not the same as
    // being able to force a named call, and this engine forces one every time.
    expect(rows.find((r: { id: string }) => r.id === "openai/gpt-6-astra").forcesTools).toBe(false);
    expect(rows[0].forcesTools).toBe(true);
  });

  it("filters by vendor and by price ceiling", () => {
    expect(candidates(CATALOGUE, { vendor: ["google"] }).map((r: { id: string }) => r.id)).toEqual([
      "google/gemini-3.8-flash",
    ]);
    expect(candidates(CATALOGUE, { maxIn: 1 }).map((r: { id: string }) => r.id)).toEqual([
      "google/gemini-3.8-flash",
    ]);
  });
});
