import Anthropic from "@anthropic-ai/sdk";
import type { AnalyzeImage, Lang } from "../../shared/types";
import { buildUserContent, ENGINE_PROMPT_V1 } from "./prompt";
import { postValidate, type PostValidated } from "./postvalidate";
import { REPORT_VERDICT_TOOL, type RawVerdict } from "./tool";

export const ENGINE_TIMEOUT_MS = 10_000;
export const ENGINE_IMAGE_TIMEOUT_MS = 25_000;
// BUILD.md specifies 800. A full Arabic verdict — four quotes, four reasons and
// three actions — lands close enough to that ceiling that a long message can
// truncate the tool call, and output is billed on tokens produced, so the
// headroom is free. Logged as a deliberate divergence in DECISIONS.md.
const BASE_MAX_TOKENS = 2000;

export class EngineTimeout extends Error {}
export class EngineRateLimited extends Error {}
export class EngineFailure extends Error {}

/**
 * A gateway such as OpenRouter names the same model `anthropic/claude-opus-5`.
 * Everything below reasons about the model itself, so the vendor prefix comes
 * off first — otherwise every profile test silently stops matching and the
 * wrong request shape goes out.
 */
export function bareModel(model: string): string {
  const slash = model.indexOf("/");
  return slash === -1 ? model : model.slice(slash + 1);
}

/**
 * The request surface differs by model, and getting it wrong is a 400:
 *
 * - Sonnet 5 (and the Opus 4.7+ family) reject non-default `temperature`, and
 *   run adaptive thinking when `thinking` is omitted. Thinking would spend the
 *   token budget and the seconds this demo does not have, so it is turned off
 *   explicitly.
 * - Haiku 4.5 still accepts `temperature`, and does not think unless asked.
 * - Anything that is not a Claude model gets neither field. `thinking` and the
 *   temperature rules are Anthropic's; sending them through a gateway to a
 *   Gemini or a GPT is a 400 or a silently ignored key, and neither is a thing
 *   to discover on stage.
 */
function modelProfile(model: string): {
  isClaude: boolean;
  acceptsTemperature: boolean;
  acceptsThinkingDisabled: boolean;
} {
  const bare = bareModel(model);
  const isClaude = bare.startsWith("claude-");
  const legacySampling = /^claude-(haiku-4-5|sonnet-4-5|haiku-3|sonnet-3)/.test(bare);
  return {
    isClaude,
    acceptsTemperature: isClaude && legacySampling,
    acceptsThinkingDisabled: isClaude && !legacySampling,
  };
}

export interface AnalyzeArgs {
  apiKey: string;
  model: string;
  /**
   * Where to send the request. Unset means Anthropic directly. A gateway that
   * speaks the Messages API — OpenRouter's is at https://openrouter.ai/api —
   * goes here, and nothing else about the call changes.
   */
  baseURL?: string;
  /** "disabled" (default) or "adaptive". Set with the ENGINE_THINKING var. */
  thinking?: string;
  text: string;
  lang: Lang;
  channel?: string;
  /** What the person says they are looking at. A hint only. */
  type?: string;
  /** A screenshot to read. Held for this request only; never written anywhere. */
  image?: AnalyzeImage;
  /** Deterministic link facts computed before the call, passed as context. */
  linkFacts?: string;
}

/**
 * The request body, split out so the per-model shape can be asserted in tests.
 * Sending `temperature` to Sonnet 5, or letting it default to adaptive thinking,
 * are both silent mistakes a local run cannot catch — the first is a 400, the
 * second quietly spends the token budget and the demo's seconds.
 */
export function buildRequestBody(
  args: AnalyzeArgs,
): Anthropic.MessageCreateParamsNonStreaming {
  const profile = modelProfile(args.model);
  const wantsThinking = args.thinking === "adaptive";

  const instructions = buildUserContent(args.text, args.lang, args.channel, {
    hasImage: Boolean(args.image),
    linkFacts: args.linkFacts,
    type: args.type,
  });

  // The image goes first: the model reads the screenshot, then the framing that
  // tells it what to do with what it read.
  const content: Anthropic.ContentBlockParam[] = args.image
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: args.image.media_type,
            data: args.image.data,
          },
        },
        { type: "text", text: instructions },
      ]
    : [{ type: "text", text: instructions }];

  const body: Anthropic.MessageCreateParamsNonStreaming = {
    model: args.model,
    // A screenshot verdict also carries the text it read, so it needs more room.
    max_tokens: wantsThinking ? 4000 : args.image ? 3000 : BASE_MAX_TOKENS,
    system: ENGINE_PROMPT_V1,
    tools: [REPORT_VERDICT_TOOL],
    tool_choice: { type: "tool", name: REPORT_VERDICT_TOOL.name },
    messages: [{ role: "user", content }],
  };

  if (wantsThinking && profile.acceptsThinkingDisabled) {
    body.thinking = { type: "adaptive" };
  } else if (profile.acceptsTemperature) {
    // Haiku 4.5 has no adaptive mode; asking for one is a 400.
    body.temperature = 0;
  } else if (profile.acceptsThinkingDisabled) {
    body.thinking = { type: "disabled" };
  }

  return body;
}

export interface AnalyzeResult extends PostValidated {
  model: string;
  latency_ms: number;
}

export async function runEngine(args: AnalyzeArgs): Promise<AnalyzeResult> {
  const client = new Anthropic({
    apiKey: args.apiKey,
    ...(args.baseURL ? { baseURL: args.baseURL } : {}),
    // One shot inside the 10s wall: a retry would spend the whole budget.
    maxRetries: 0,
  });

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    args.image ? ENGINE_IMAGE_TIMEOUT_MS : ENGINE_TIMEOUT_MS,
  );
  const startedAt = Date.now();

  let message: Anthropic.Message;
  try {
    const body = buildRequestBody(args);
    message = await client.messages.create(body, { signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new EngineTimeout("engine timed out");
    if (error instanceof Anthropic.APIError && error.status === 429) {
      throw new EngineRateLimited("upstream rate limit");
    }
    // Deliberately not logging the error body: it can echo the pasted message.
    const status =
      error instanceof Anthropic.APIError ? `status ${error.status}` : "network error";
    throw new EngineFailure(`engine call failed (${status})`);
  } finally {
    clearTimeout(timer);
  }

  const latency_ms = Date.now() - startedAt;

  const toolUse = message.content.find(
    (block): block is Anthropic.ToolUseBlock =>
      block.type === "tool_use" && block.name === REPORT_VERDICT_TOOL.name,
  );
  if (!toolUse) {
    throw new EngineFailure(`engine returned no verdict (stop: ${message.stop_reason})`);
  }

  if (message.stop_reason === "max_tokens") {
    throw new EngineFailure("engine output truncated at max_tokens");
  }

  const validated = postValidate(toolUse.input as RawVerdict, args.text, {
    hasImage: Boolean(args.image),
  });
  return { ...validated, model: args.model, latency_ms };
}
