import { useEffect, useRef } from "react";
import { useI18n } from "../i18n";

/**
 * The real mark, not a stand-in.
 *
 * public/brand/dara-mark.png is Abdelrahman's brush-stroke درع, and it is the
 * same artwork the installed app shows on a phone's home screen — so the thing
 * you tap and the thing you see inside are one identity. It renders as shipped:
 * not redrawn, not recoloured, not traced.
 */
export function Logo({ onLongPress }: { onLongPress?: () => void }) {
  const { t, lang } = useI18n();
  const press = useLongPress(onLongPress);

  return (
    <div className="flex min-w-0 items-center gap-3" {...press}>
      <img
        src="/brand/dara-mark.png"
        alt=""
        width={44}
        height={44}
        className="size-11 shrink-0 rounded-[13px] object-cover"
      />
      <span className="min-w-0">
        <span
          dir="ltr"
          className="block text-[21px] font-extrabold leading-none tracking-[-0.5px]"
        >
          DARA&rsquo;
        </span>
        <span className="mt-1.5 block text-[11px] font-semibold leading-tight text-white/70">
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
