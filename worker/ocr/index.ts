import { gemma } from "./gemma";
import { haiku } from "./haiku";
import { detectLang, OcrFailed, OcrRetryable, type OcrArgs, type OcrProvider, type Transcript } from "./types";

export * from "./types";
export { gemma } from "./gemma";
export { haiku } from "./haiku";

/**
 * Gemma first, Haiku second, and if neither can read it, nothing.
 *
 * Gemma leads on price — $0.09 against $1.00 per million input tokens — not
 * on any claim about which reads Arabic better. That question belongs to
 * docs/image-scan/OCR-COMPARE.md and the ten screenshots in it; if the table
 * says Haiku wins on Arabic, the order here changes. Two vendors on purpose,
 * so one of them having a bad morning is not the demo's problem.
 *
 * The one thing this will not do is invent a fallback. An unreadable image
 * ends as `ocr_failed` and the screen asks for the text instead. A verdict on
 * a picture nobody could read is worse than no verdict, and in front of a
 * jury it is the kind of worse that gets noticed.
 */
export const OCR_CHAIN: OcrProvider[] = [gemma, haiku];

export async function transcribe(args: OcrArgs, chain: OcrProvider[] = OCR_CHAIN): Promise<Transcript> {
  const failures: string[] = [];

  for (const provider of chain) {
    const startedAt = Date.now();
    try {
      const { text, usage } = await provider.transcribe(args);
      return {
        text,
        lang: detectLang(text),
        provider: provider.name,
        ms: Date.now() - startedAt,
        usage,
      };
    } catch (error) {
      if (error instanceof OcrRetryable) {
        failures.push(`${provider.name}: ${error.message}`);
        continue;
      }
      throw error;
    }
  }

  // Every provider declined. Say so; never guess at the text.
  throw new OcrFailed(`ocr_failed (${failures.join("; ") || "no providers"})`);
}

/** Both providers reach the same gateway, so one key readies both. */
export function ocrReady(apiKey: string | undefined): boolean {
  return Boolean(apiKey);
}

/**
 * Pin the chain to one provider, for the comparison table only.
 *
 * Same shape as the engine's X-DARA-Model: the caller may name a provider,
 * and only a name on the configured allowlist is honoured. Unset allowlist
 * means nothing can be pinned, so production is the chain and only the chain.
 */
export function chainFor(requested: string | undefined, allowed: string | undefined): OcrProvider[] {
  if (!requested) return OCR_CHAIN;
  const permitted = (allowed ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (!permitted.includes(requested)) return OCR_CHAIN;
  const only = OCR_CHAIN.find((provider) => provider.name === requested);
  // Pinned means pinned: no fallback, or the table would measure the chain
  // instead of the provider.
  return only ? [only] : OCR_CHAIN;
}
