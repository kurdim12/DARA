import { describe, expect, it } from "vitest";
import { buildRequestBody } from "../worker/engine/analyze";

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
    expect(body.max_tokens).toBe(800);
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

  it("forces the verdict tool so no free prose is ever parsed", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(body.tool_choice).toEqual({ type: "tool", name: "report_verdict" });
    expect(body.tools).toHaveLength(1);
  });

  it("wraps the pasted message in delimiters and labels it as data", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    const content = body.messages[0]!.content as string;
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
    expect(body.messages[0]!.content as string).not.toContain("CHANNEL:");
  });

  it("puts the engine prompt in the system field, not in the user turn", () => {
    const body = buildRequestBody({ ...base, model: "claude-sonnet-5" });
    expect(String(body.system)).toContain("report_verdict tool");
    expect(body.messages[0]!.content as string).not.toContain("report_verdict tool");
  });
});
