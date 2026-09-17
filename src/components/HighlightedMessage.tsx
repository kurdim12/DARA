import type { RedFlag } from "../../shared/types";

/**
 * The original message with each red flag filled in place and numbered, so the
 * «لماذا» list below can point at it — and, when the screen offers it, so that
 * tapping a span lights up the reason it belongs to.
 *
 * The text is rendered as text. A link inside an analyzed message is never
 * made clickable — tapping it is the exact thing the app is warning against —
 * which is also why a flagged span is a <button> only when something is
 * listening: an inert control is worse than none.
 */
export function HighlightedMessage({
  text,
  flags,
  selected = null,
  onSelect,
  label,
}: {
  text: string;
  flags: RedFlag[];
  /** Index of the flag currently lit, or null. */
  selected?: number | null;
  /** Given, each span becomes tappable and reports which one was tapped. */
  onSelect?: (index: number | null) => void;
  /** Accessible name for a tappable span, with {n} for its number. */
  label?: (n: number) => string;
}) {
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

    const body = (
      <>
        {text.slice(flag.start, flag.end)}
        <span className="badge" aria-hidden="true">
          {index + 1}
        </span>
      </>
    );

    pieces.push(
      onSelect ? (
        <mark
          className="flag"
          key={`f${index}`}
          role="button"
          tabIndex={0}
          aria-pressed={selected === index}
          aria-label={label?.(index + 1)}
          onClick={() => onSelect(selected === index ? null : index)}
          onKeyDown={(event) => {
            if (event.key !== "Enter" && event.key !== " ") return;
            event.preventDefault();
            onSelect(selected === index ? null : index);
          }}
        >
          {body}
        </mark>
      ) : (
        <mark className="flag" key={`f${index}`}>
          {body}
        </mark>
      ),
    );
    cursor = flag.end;
  });

  if (cursor < text.length) {
    pieces.push(<span key="tail">{text.slice(cursor)}</span>);
  }

  return (
    <p
      dir="auto"
      className="whitespace-pre-wrap break-words rounded-card border border-line bg-card p-4 text-[15px] font-medium leading-loose text-ink"
    >
      {pieces}
    </p>
  );
}
