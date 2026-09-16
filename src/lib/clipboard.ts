/**
 * Reading the clipboard, without a dead button.
 *
 * A browser that will not hand over the clipboard does not always refuse out
 * loud: with the permission withheld, Chromium's readText() simply never
 * settles, and the promise is still pending when the presenter has moved on.
 * Every caller here races it, so a press either produces text or produces a
 * sentence saying it could not.
 */

/** Long enough that nothing useful is waiting behind a slow answer. */
export const CLIP_TIMEOUT_MS = 3000;

export async function readClipboardText(): Promise<string> {
  if (!navigator.clipboard?.readText) throw new Error("no clipboard api");
  return Promise.race([
    navigator.clipboard.readText(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("clipboard timed out")), CLIP_TIMEOUT_MS),
    ),
  ]);
}
