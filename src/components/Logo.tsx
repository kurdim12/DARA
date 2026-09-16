import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

/**
 * The mark is the identity: the white brush درع on the brand red, exactly as
 * it was painted. public/brand/dara-mark-white.png is the stroke on
 * transparency, so the tile supplies the red and nothing is recoloured — the
 * one rule the mark has.
 *
 * In Arabic the brush stands on its own beside the tagline. Setting DARA' in
 * Latin next to a word the reader is already looking at, in Arabic, adds
 * nothing.
 */
export function Logo({ onLongPress }: { onLongPress?: () => void }) {
  const { t, lang } = useI18n();
  const press = useLongPress(onLongPress);

  return (
    <div className="flex min-w-0 items-center gap-2.5" {...press}>
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-red"
      >
        <img src="/brand/dara-mark-white.png" alt="" width={28} className="w-7" />
      </span>

      {lang === "ar" ? (
        // The mark already reads درع. Setting the same word in type beside it
        // says it twice, so in Arabic the brush stands alone with the line
        // that says what it is.
        <span className="t-sub min-w-0 text-[12px] leading-snug">{t("home.eyebrow")}</span>
      ) : (
        <span className="relative min-w-0 leading-none" dir="ltr">
          <span className="block font-display text-[22px] font-extrabold leading-none tracking-[-0.3px]">
            DARA&rsquo;
          </span>
          <span
            lang="ar"
            dir="rtl"
            className="absolute -bottom-3 end-0 text-[11px] font-bold leading-none text-ink-2"
          >
            درع
          </span>
        </span>
      )}
    </div>
  );
}

/**
 * A long press on the mark opens the staged-message tray. The timer is a ref,
 * not a render-scoped variable: a plain tap must never trip it, and an unmount
 * must never leave a timer running.
 */
function useLongPress(onLongPress?: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const cancel = () => clearTimeout(timer.current);

  useEffect(() => () => clearTimeout(timer.current), []);

  if (!onLongPress) return {};
  return {
    onPointerDown: () => {
      cancel();
      timer.current = setTimeout(onLongPress, 1200);
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
  };
}
