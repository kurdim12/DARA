import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { useI18n } from "../i18n";

/**
 * What the app is doing while the model thinks.
 *
 * A link scan measured 7.2-9.5 seconds against the gateway. For that long, a
 * bare spinner reads as a hang — the person cannot tell a slow answer from a
 * dead app, and on a stage that difference is the whole demo.
 *
 * The stages are honest about what they describe: reading and the domain check
 * really do happen first and really are fast (the URL parse is local and
 * sub-millisecond), and "analysing" is the wait. The timings below advance the
 * display, they do not claim to measure each step — which is why the last
 * stage simply stays lit until the answer lands rather than pretending to
 * progress.
 */
const STAGES = [
  { key: "scan.stage_read", at: 0 },
  { key: "scan.stage_domain", at: 700 },
  { key: "scan.stage_analyze", at: 1600 },
] as const;

export function ScanProgress() {
  const { t } = useI18n();
  const [reached, setReached] = useState(0);

  useEffect(() => {
    const timers = STAGES.map((stage, index) =>
      setTimeout(() => setReached((was) => Math.max(was, index)), stage.at),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <ul className="mt-4 space-y-2.5" aria-live="polite">
      {STAGES.map((stage, index) => {
        const done = index < reached;
        const active = index === reached;
        return (
          <li
            key={stage.key}
            className={`flex items-center gap-2.5 text-[15px] ${
              active ? "font-bold text-ink" : done ? "text-ink-2" : "text-ink-2 opacity-45"
            }`}
          >
            <span className="flex size-5 shrink-0 items-center justify-center">
              {done ? (
                <Check size={17} strokeWidth={2.25} aria-hidden="true" />
              ) : active ? (
                <Loader2 size={17} strokeWidth={2.25} className="spin" aria-hidden="true" />
              ) : (
                <span aria-hidden="true" className="size-1.5 rounded-full bg-line" />
              )}
            </span>
            {t(stage.key)}
          </li>
        );
      })}
    </ul>
  );
}
