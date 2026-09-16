import { OCR_TIMEOUT_MS, OcrRetryable, TRANSCRIBE_PROMPT, type OcrArgs, type OcrProvider, type OcrResult } from "./types";

/**
 * Gemma 4 31B on OpenRouter, spoken in the OpenAI chat shape.
 *
 * Verified against the public catalogue rather than assumed: image input,
 * 262K context, $0.09/M in and $0.34/M out — about eleven times cheaper on
 * input than the Haiku fallback, which is the entire reason it goes first.
 *
 * The PAID id, deliberately. `:free` variants are rate-limited to the point
 * of being unusable in a demo, and OpenRouter's free tier carries different
 * data terms — see docs/image-scan/PRIVACY.md.
 */
export const MODEL = "google/gemma-4-31b-it";
const ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const gemma: OcrProvider = {
  name: "openrouter-gemma4",
  model: MODEL,
  async transcribe({ image, apiKey, referer, signal }: OcrArgs): Promise<OcrResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), OCR_TIMEOUT_MS);
    // The caller's own abort has to reach this request too.
    const onAbort = () => controller.abort();
    signal?.addEventListener("abort", onAbort, { once: true });

    let res: Response;
    try {
      res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey}`,
          "content-type": "application/json",
          // OpenRouter attributes traffic with these two.
          "HTTP-Referer": referer ?? "https://dara.abdalrhmankurdi12.workers.dev",
          "X-Title": "DARA",
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1200,
          temperature: 0,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: { url: `data:${image.media_type};base64,${image.data}` },
                },
                { type: "text", text: TRANSCRIBE_PROMPT },
              ],
            },
          ],
        }),
      });
    } catch (error) {
      // Aborted, or the connection never landed. Either way the next
      // provider gets its turn.
      throw new OcrRetryable(
        controller.signal.aborted ? "gemma timed out" : "gemma network error",
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    }

    // 429 and 5xx are the gateway having a bad moment, not this image being
    // unreadable. 4xx otherwise means this provider will not serve us at all,
    // which is equally a reason to move on.
    if (!res.ok) throw new OcrRetryable(`gemma answered ${res.status}`);

    const body = (await res.json()) as {
      choices?: { message?: { content?: unknown } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const content = body.choices?.[0]?.message?.content;
    const text = typeof content === "string" ? content.trim() : "";
    // Empty is a failure, not an empty screenshot: an unreadable image must
    // never become a verdict.
    if (!text) throw new OcrRetryable("gemma returned no text");
    return {
      text,
      usage: {
        input_tokens: body.usage?.prompt_tokens ?? 0,
        output_tokens: body.usage?.completion_tokens ?? 0,
      },
    };
  },
};
