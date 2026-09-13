import type { RedFlag } from "../../shared/types";
import { useI18n } from "../i18n";
import { stepNumeral } from "../lib/numerals";

/**
 * The original message with each red flag underlined in place and numbered,
 * so the "Why" list below can point at it.
 *
 * The text is rendered as text. A link inside an analyzed message is never
 * made clickable — tapping it is the exact thing the app is warning against.
 */
export function HighlightedMessage({
  text,
  flags,
}: {
  text: string;
  flags: RedFlag[];
}) {
  const { lang } = useI18n();
  const pieces: React.ReactNode[] = [];
  let cursor = 0;

  // postValidate already sorts and de-overlaps these, but this walk has one
  // cursor and no way to go backwards: a flag out of document order would
  // duplicate half the message on the one screen the demo is built around.
  const ordered = [...flags].sort((a, b) => a.start - b.start);

  ordered.forEach((flag, index) => {
    if (flag.start > cursor) {
      pieces.push(<span key={`t${index}`}>{text.slice(cursor, flag.start)}</span>);
    }
    pieces.push(
      <mark className="flag" key={`f${index}`}>
        {text.slice(flag.start, flag.end)}
        <sup>{stepNumeral(index + 1, lang)}</sup>
      </mark>,
    );
    cursor = flag.end;
  });

  if (cursor < text.length) {
    pieces.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return (
    <p
      dir="auto"
      className="whitespace-pre-wrap break-words rounded-card bg-bg p-4 text-[15px] leading-relaxed text-text"
    >
      {pieces}
    </p>
  );
}
