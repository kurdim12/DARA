import type { Verdict } from "../../shared/types";
import { useI18n } from "../i18n";

/**
 * The verdict, said in one word. Red is reserved for danger and nothing else:
 * a suspicious result sits on the second paper tone with a warning mark, a
 * likely-safe one is plain ink with a check. No colour carries meaning here
 * except the red, and the red only ever means threat.
 */
export function VerdictBand({ verdict }: { verdict: Verdict }) {
  const { t } = useI18n();
  const label = t(`verdict.${verdict}` as const);

  if (verdict === "scam") {
    return (
      <div role="status" className="border-t-2 border-threat pt-4">
        <p className="font-kufi text-[28px] font-bold leading-tight text-threat">{label}</p>
      </div>
    );
  }

  if (verdict === "suspicious") {
    return (
      <div role="status" className="flex items-center gap-3 bg-paper-2 px-4 py-4">
        <Warning />
        <p className="font-kufi text-[28px] font-bold leading-tight text-ink">{label}</p>
      </div>
    );
  }

  return (
    <div role="status" className="flex items-center gap-3 border-t border-rule pt-4">
      <Check />
      <p className="font-kufi text-[28px] font-bold leading-tight text-ink">{label}</p>
    </div>
  );
}

/* Drawn, not an emoji: the deck has no emoji in it. */
function Check() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="shrink-0">
      <path
        d="M4 13l5.5 5.5L20 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="square"
      />
    </svg>
  );
}

function Warning() {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true" className="shrink-0">
      <path
        d="M12 3L22 20H2L12 3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="miter"
      />
      <path d="M12 10v5" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M12 17.4v.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
