import { describe, expect, it } from "vitest";
import { buildRequestBody, bareModel } from "../worker/engine/analyze";

/** Message content is a block array now, so pull the instructions out of it. */
function instructions(body: ReturnType<typeof buildRequestBody>): string {
  const content = body.messages[0]!.content;
  if (typeof content === "string") return content;
  const block = content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

const base = {
  apiKey: "unused",
  text: "تهانينا! رقمك فاز بـ 5000 دينار.",
  lang: "ar" as const,
  channel: "sms",
};

describe("buildRequestBody", () => {
  it("does not send temperature to Sonnet 5, which rejects it", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(body).not.toHaveProperty("temperature");
  });

  it("turns thinking off explicitly on Sonnet 5, which would otherwise run adaptive", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body.max_tokens).toBe(2000);
  });

  it("sends temperature to Haiku 4.5 and leaves thinking unset", () => {
    const body = buildRequestBody({ ...base, model: "claude-haiku-4-5" });
    expect(body.temperature).toBe(0);
    expect(body).not.toHaveProperty("thinking");
  });

  it("treats the dated Haiku id the same as the alias", () => {
    const body = buildRequestBody({ ...base, model: "claude-haiku-4-5-20251001" });
    expect(body.temperature).toBe(0);
    expect(body).not.toHaveProperty("thinking");
  });

  it("gives adaptive thinking room to answer inside max_tokens", () => {
    const body = buildRequestBody({
      ...base,
      model: "claude-sonnet-5",
      thinking: "adaptive",
    });
    expect(body.thinking).toEqual({ type: "adaptive" });
    expect(body.max_tokens).toBe(4000);
    expect(body).not.toHaveProperty("temperature");
  });

  it("never asks Haiku 4.5 for adaptive thinking, which it cannot do", () => {
    const body = buildRequestBody({
      ...base,
      model: "claude-haiku-4-5",
      thinking: "adaptive",
    });
    expect(body).not.toHaveProperty("thinking");
    expect(body.temperature).toBe(0);
  });

  it("forces the verdict tool so no free prose is ever parsed", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(body.tool_choice).toEqual({ type: "tool", name: "report_verdict" });
    expect(body.tools).toHaveLength(1);
  });

  it("wraps the pasted message in delimiters and labels it as data", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    const content = instructions(body);
    expect(content).toContain("LANG: ar");
    expect(content).toContain("CHANNEL: sms");
    expect(content).toContain("<<<");
    expect(content).toContain(base.text);
    expect(content).toContain(">>>");
  });

  it("omits the channel line when no channel was chosen", () => {
    const body = buildRequestBody({
      ...base,
      channel: undefined,
      model: "claude-sonnet-5",
    });
    expect(instructions(body)).not.toContain("CHANNEL:");
  });

  it("puts the engine prompt in the system field, not in the user turn", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(String(body.system)).toContain("report_verdict tool");
    expect(instructions(body)).not.toContain("report_verdict tool");
  });
  it("sends a screenshot as an image block, before the instructions", () => {
    const body = buildRequestBody({
      ...base,
      model: "claude-sonnet-5",
      image: { media_type: "image/png", data: "AAAA" },
    });
    const content = body.messages[0]!.content;
    expect(Array.isArray(content)).toBe(true);
    const blocks = content as { type: string }[];
    expect(blocks[0]!.type).toBe("image");
    expect(blocks[1]!.type).toBe("text");
    const image = blocks[0] as unknown as {
      source: { type: string; media_type: string; data: string };
    };
    expect(image.source.type).toBe("base64");
    expect(image.source.media_type).toBe("image/png");
    expect(image.source.data).toBe("AAAA");
  });

  it("tells the engine a screenshot is the thing to analyze", () => {
    const body = buildRequestBody({
      ...base,
      model: "claude-sonnet-5",
      image: { media_type: "image/jpeg", data: "AAAA" },
    });
    expect(instructions(body)).toContain("SCREENSHOT:");
  });

  it("gives a screenshot verdict room for the text it read", () => {
    const withImage = buildRequestBody({
      ...base,
      model: "claude-sonnet-5",
      image: { media_type: "image/png", data: "AAAA" },
    });
    const withoutImage = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(withImage.max_tokens).toBeGreaterThan(withoutImage.max_tokens);
  });

  it("passes deterministic link facts through as context", () => {
    const body = buildRequestBody({
      ...base,
      model: "claude-sonnet-5",
      linkFacts: "hostname=mof-jo.verify-now.com; signals=suspicious_words",
    });
    const text = instructions(body);
    expect(text).toContain("LINK FACTS:");
    expect(text).toContain("mof-jo.verify-now.com");
  });

  it("sends no image block when there is no screenshot", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    const blocks = body.messages[0]!.content as { type: string }[];
    expect(blocks.every((b) => b.type !== "image")).toBe(true);
  });
});

/**
 * The Scan chips send a `type`. It is a hint, and it reaches the model as one
 * more line of framing — nothing in post-validation keys off it.
 */
describe("the analysis type hint", () => {
  it("carries TYPE into the instructions when the caller sent one", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5", type: "call" });
    expect(instructions(body)).toContain("TYPE: call");
  });

  it("says nothing about a type when the caller did not send one", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(instructions(body)).not.toContain("TYPE:");
  });

  it("keeps CHANNEL and TYPE as separate lines — they are different questions", () => {
    const text = instructions(
      buildRequestBody({ ...base, model: "claude-sonnet-5", type: "message" }),
    );
    expect(text).toContain("CHANNEL: sms");
    expect(text).toContain("TYPE: message");
  });
});

describe("gateway model ids", () => {
  it("strips a vendor prefix before profiling the model", () => {
    expect(bareModel("anthropic/claude-opus-5")).toBe("claude-opus-5");
    expect(bareModel("claude-opus-5")).toBe("claude-opus-5");
    expect(bareModel("google/gemini-3.8-flash")).toBe("gemini-3.8-flash");
  });

  it("sends a prefixed Claude the same body as an unprefixed one", () => {
    const direct = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    const viaGateway = buildRequestBody({ ...base, model: "anthropic/claude-sonnet-5" });
    expect(viaGateway.thinking).toEqual(direct.thinking);
    expect(viaGateway.temperature).toBe(direct.temperature);
    expect(viaGateway.tool_choice).toEqual(direct.tool_choice);
  });

  it("still gives a prefixed Haiku its temperature and no thinking", () => {
    const body = buildRequestBody({ ...base, model: "anthropic/claude-haiku-4-5" });
    expect(body.temperature).toBe(0);
    expect(body.thinking).toBeUndefined();
  });

  it("sends neither thinking nor temperature to a non-Claude model", () => {
    // Both fields are Anthropic's. Through a gateway they reach a model that
    // either 400s on them or ignores them, and the 400 arrives at demo time.
    for (const model of ["google/gemini-3.8-flash", "openai/gpt-6-astra", "x-ai/grok-5"]) {
      const body = buildRequestBody({ ...base, model });
      expect(body.thinking, model).toBeUndefined();
      expect(body.temperature, model).toBeUndefined();
      // The forced tool call is the whole contract and must survive.
      expect(body.tool_choice, model).toEqual({ type: "tool", name: "report_verdict" });
    }
  });
});
