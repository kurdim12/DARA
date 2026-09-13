import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

/**
 * The submitted app's mark: a blue rounded square with a white D, the word
 * DARA' beside it, and درع in primary tucked under the apostrophe.
 *
 * This is not the brush-stroke درع in public/brand — that file is untouched.
 */
export function Logo({ onLongPress }: { onLongPress?: () => void }) {
  const { lang } = useI18n();
  const press = useLongPress(onLongPress);

  return (
    <div className="flex items-center gap-2.5" {...press}>
      <span
        aria-hidden="true"
        className="flex size-9 items-center justify-center rounded-[10px] bg-primary"
      >
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
          <path
            d="M12 2.5 4.5 5.5v6.2c0 4.6 3.1 8.4 7.5 9.8 4.4-1.4 7.5-5.2 7.5-9.8V5.5L12 2.5z"
            stroke="white"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <text
            x="12"
            y="15.4"
            textAnchor="middle"
            fill="white"
            fontSize="9"
            fontWeight="700"
            fontFamily="Inter, system-ui, sans-serif"
          >
            D
          </text>
        </svg>
      </span>
      <span className="relative leading-none" dir="ltr">
        <span className="text-[22px] font-bold tracking-tight">DARA&rsquo;</span>
        <span
          lang="ar"
          dir="rtl"
          className="absolute -bottom-2.5 text-[12px] font-semibold text-primary"
          style={{ insetInlineEnd: lang === "ar" ? undefined : 0, right: 0 }}
        >
          درع
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
