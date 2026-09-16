import Anthropic from "@anthropic-ai/sdk";
import { OCR_TIMEOUT_MS, OcrRetryable, TRANSCRIBE_PROMPT, type OcrArgs, type OcrProvider, type OcrResult } from "./types";

/**
 * The fallback, reached through the same gateway and the same key.
 *
 * Verified against the catalogue: image input, 200K context, $1.00/M in and
 * $5.00/M out — eleven times Gemma's input price, which is why it is second
 * rather than first. One key, one bill, two vendors.
 */
export const MODEL = "anthropic/claude-haiku-4.5";

export const haiku: OcrProvider = {
  name: "anthropic-haiku",
  model: MODEL,
  async transcribe({ image, apiKey, signal }: OcrArgs): Promise<OcrResult> {
    const client = new Anthropic({
      apiKey,
      baseURL: "https://openrouter.ai/api",
      // One shot inside 8s; a retry would spend the whole budget.
      maxRetries: 0,
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    let message: Anthropic.Message;
    try {
      message = await client.messages.create(
        {
          model: MODEL,
          max_tokens: 1200,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image",
                  source: {
                    type: "base64",
                    media_type: image.media_type,
                    data: image.data,
                  },
                },
                { type: "text", text: TRANSCRIBE_PROMPT },
              ],
            },
          ],
        },
        { signal: controller.signal },
      );
    } catch (error) {
      if (controller.signal.aborted) throw new OcrRetryable("haiku timed out");
      // Deliberately not logging the body: it can echo the screenshot's text.
      const status = error instanceof Anthropic.APIError ? `status ${error.status}` : "network error";
      throw new OcrRetryable(`haiku failed (${status})`);
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    const text = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (!text) throw new OcrRetryable("haiku returned no text");
    return {
      text,
      usage: {
        input_tokens: message.usage?.input_tokens ?? 0,
        output_tokens: message.usage?.output_tokens ?? 0,
      },
    };
  },
};
