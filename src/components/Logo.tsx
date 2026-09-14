import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

/**
 * The hero's identity block: a white badge carrying the navy shield-D, the
 * wordmark, and one line saying what DARA' is.
 *
 * This is not the brush-stroke درع in public/brand — that file is untouched.
 */
export function Logo({ onLongPress }: { onLongPress?: () => void }) {
  const { t, lang } = useI18n();
  const press = useLongPress(onLongPress);

  return (
    <div className="flex min-w-0 items-center gap-2.5" {...press}>
      <span
        aria-hidden="true"
        className="flex size-[34px] shrink-0 items-center justify-center rounded-[11px] bg-white"
      >
        <svg viewBox="0 0 24 24" width="21" height="21" fill="none">
          <path
            d="M12 2.5 4.5 5.5v6.2c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.5L12 2.5z"
            stroke="var(--navy)"
            strokeWidth="1.9"
            strokeLinejoin="round"
          />
          <text
            x="12"
            y="15.8"
            textAnchor="middle"
            fill="var(--navy)"
            fontSize="9.5"
            fontWeight="800"
            fontFamily="Manrope, system-ui, sans-serif"
          >
            D
          </text>
        </svg>
      </span>
      <span className="min-w-0">
        <span dir="ltr" className="block text-[20px] font-extrabold leading-none tracking-tight">
          DARA&rsquo;
        </span>
        <span className="mt-1 block text-[11px] font-medium leading-tight text-white/80">
          {lang === "en" ? (
            <>
              <bdi lang="ar">درع</bdi> · {t("home.eyebrow")}
            </>
          ) : (
            t("home.eyebrow")
          )}
        </span>
      </span>
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
