import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * The chain is what turns "a good model" into "a demo that finishes". It has
 * one rule that is easy to get wrong in the other direction: a timeout must
 * NOT fall back. The wall is ten seconds; a timeout has already spent most of
 * it, and a second attempt leaves a presenter watching a spinner instead of
 * showing an error and moving on.
 */
const create = vi.fn();
vi.mock("@anthropic-ai/sdk", () => {
  class APIError extends Error {
    constructor(readonly status: number) {
      super(`status ${status}`);
    }
  }
  class Anthropic {
    static APIError = APIError;
    messages = { create };
  }
  return { default: Anthropic, APIError };
});

const { runEngine, EngineTimeout } = await import("../worker/engine/analyze");
const AnthropicMod = await import("@anthropic-ai/sdk");
const APIError = (AnthropicMod as unknown as { APIError: new (s: number) => Error }).APIError;

const TEXT = "أمانة عمان الكبرى: بذمتك مخالفة مرورية غير مدفوعة. ادفع خلال 24 ساعة.";

/** A well-formed forced tool call, the shape postValidate expects. */
function goodReply() {
  return {
    stop_reason: "tool_use",
    content: [
      {
        type: "tool_use",
        name: "report_verdict",
        input: {
          verdict: "scam",
          confidence: 90,
          category: "traffic_fine",
          impersonated_entity: "أمانة عمان الكبرى",
          headline: "رسالة تنتحل صفة أمانة عمان الكبرى.",
          red_flags: [{ quote: "خلال 24 ساعة", why: "مهلة قصيرة تمنع التحقق." }],
          actions: ["لا تدفع عبر الرابط."],
          report_recommended: true,
          route_to_shield: false,
          attack_goal: "obtain_payment",
          requested_action: "الدفع خلال 24 ساعة",
          pressure_methods: ["urgency"],
        },
      },
    ],
  };
}

const ARGS = {
  apiKey: "k",
  model: "openai/gpt-6-astra",
  text: TEXT,
  lang: "ar" as const,
  fallbacks: ["anthropic/claude-opus-5", "openai/gpt-5.4"],
};

beforeEach(() => {
  create.mockReset();
  vi.useRealTimers();
});
afterEach(() => vi.useRealTimers());

describe("the model chain", () => {
  it("uses the primary and never calls a fallback when it works", async () => {
    create.mockResolvedValueOnce(goodReply());
    const out = await runEngine(ARGS);
    expect(create).toHaveBeenCalledTimes(1);
    expect(out.model).toBe("openai/gpt-6-astra");
  });

  it("moves to the next model when the primary is rate-limited", async () => {
    create.mockRejectedValueOnce(new APIError(429)).mockResolvedValueOnce(goodReply());
    const out = await runEngine(ARGS);
    expect(create).toHaveBeenCalledTimes(2);
    expect(out.model).toBe("anthropic/claude-opus-5");
  });

  it("moves on when the primary rejects this request shape", async () => {
    // A 400 here is the forced tool call being refused — the Fable 5.1 case.
    create.mockRejectedValueOnce(new APIError(400)).mockResolvedValueOnce(goodReply());
    const out = await runEngine(ARGS);
    expect(out.model).toBe("anthropic/claude-opus-5");
  });

  it("walks the whole chain and reports the model that answered", async () => {
    create
      .mockRejectedValueOnce(new APIError(404))
      .mockRejectedValueOnce(new APIError(502))
      .mockResolvedValueOnce(goodReply());
    const out = await runEngine(ARGS);
    expect(create).toHaveBeenCalledTimes(3);
    expect(out.model).toBe("openai/gpt-5.4");
  });

  it("gives up with the last error when every model fails", async () => {
    create.mockRejectedValue(new APIError(503));
    await expect(runEngine(ARGS)).rejects.toThrow();
    expect(create).toHaveBeenCalledTimes(3);
  });

  it("does not fall back after a timeout — the budget is already gone", async () => {
    create.mockImplementationOnce((_body: unknown, opts: { signal?: AbortSignal }) => {
      return new Promise((_resolve, reject) => {
        opts.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      });
    });
    vi.useFakeTimers();
    const promise = runEngine(ARGS);
    const assertion = expect(promise).rejects.toBeInstanceOf(EngineTimeout);
    await vi.advanceTimersByTimeAsync(11_000);
    await assertion;
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("does not repeat a model that is both primary and fallback", async () => {
    create.mockRejectedValueOnce(new APIError(429)).mockResolvedValueOnce(goodReply());
    const out = await runEngine({
      ...ARGS,
      model: "anthropic/claude-opus-5",
      fallbacks: ["anthropic/claude-opus-5", "openai/gpt-5.4"],
    });
    expect(create).toHaveBeenCalledTimes(2);
    expect(out.model).toBe("openai/gpt-5.4");
  });
});
