import type { TextKey } from "../i18n";

/**
 * The server's status string, in the reader's language when we have a word for
 * it. An unknown status is shown as it came back rather than guessed at.
 */
export function statusLabel(status: string, t: (key: TextKey) => string): string {
  const key = `status.${status}` as TextKey;
  const translated = t(key);
  return translated === key ? status : translated;
}
