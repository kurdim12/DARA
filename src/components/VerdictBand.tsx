import type { Verdict } from "../../shared/types";
import { useI18n } from "../i18n";

/**
 * Red means threat and nothing else: a solid band for scam, an outline for
 * suspicious, plain ink for looks-safe.
 */
export function VerdictBand({ verdict }: { verdict: Verdict }) {
  const { t } = useI18n();
  const label = t(`verdict.${verdict}` as const);

  const style =
    verdict === "scam"
      ? "bg-threat text-paper"
      : verdict === "suspicious"
        ? "border-2 border-threat text-threat"
        : "border-2 border-ink text-ink";

  return (
    <div
      className={`px-5 py-3 text-3xl font-bold tracking-tight ${style}`}
      role="status"
    >
      {label}
    </div>
  );
}
