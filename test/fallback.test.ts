import { beforeEach, describe, expect, it } from "vitest";
import type { AnalyzeResponse } from "../shared/types";
import staged from "../src/demo/staged.json";
import { cachedVerdictFor, hasCachedVerdict, rememberVerdict } from "../src/lib/demo";

/** A minimal in-memory localStorage, so the fallback can be exercised in node. */
function installStorage() {
  const map = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
      removeItem: (k: string) => void map.delete(k),
    },
  });
}

const first = (staged as { id: string; text: string; lang: "ar" | "en" }[])[0];

const verdict: AnalyzeResponse = {
  verdict: "scam",
  confidence: 94,
  category: "phishing_link",
  impersonated_entity: "البنك العربي",
  headline: "رسالة احتيال",
  red_flags: [],
  actions: [],
  report_recommended: true,
  route_to_shield: false,
  attack_goal: "steal_credentials",
  requested_action: null,
  pressure_methods: [],
  input_kind: "text",
  model: "claude-sonnet-5",
  latency_ms: 1200,
};

describe("the venue-network fallback", () => {
  beforeEach(installStorage);

  it("has nothing to fall back on before a message has ever been checked", () => {
    expect(cachedVerdictFor(first.text, first.lang)).toBeNull();
    expect(hasCachedVerdict(first.id)).toBe(false);
  });

  it("remembers a live verdict for a staged message and tags it as saved", () => {
    rememberVerdict(first.text, first.lang, verdict);
    const saved = cachedVerdictFor(first.text, first.lang);
    expect(saved).not.toBeNull();
    expect(saved?.headline).toBe(verdict.headline);
    expect(saved?.cached).toBe(true);
    expect(hasCachedVerdict(first.id)).toBe(true);
  });

  it("never remembers anything a person pasted themselves", () => {
    const mine = "رسالة خاصة من شخص أعرفه، ليست من المجموعة المحضّرة.";
    rememberVerdict(mine, "ar", verdict);
    expect(cachedVerdictFor(mine, "ar")).toBeNull();
  });

  it("does not match a staged message in the other language", () => {
    rememberVerdict(first.text, first.lang, verdict);
    expect(cachedVerdictFor(first.text, first.lang === "ar" ? "en" : "ar")).toBeNull();
  });

  it("survives storage being unavailable", () => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: {
        getItem: () => {
          throw new Error("denied");
        },
        setItem: () => {
          throw new Error("denied");
        },
      },
    });
    expect(() => rememberVerdict(first.text, first.lang, verdict)).not.toThrow();
    expect(cachedVerdictFor(first.text, first.lang)).toBeNull();
  });
});
