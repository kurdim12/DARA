import { useEffect, useRef, useState } from "react";

/**
 * Abdelrahman's brush-stroke درع. The file is dropped in at
 * public/brand/dara-mark.png and is never redrawn, recoloured or traced.
 * Until it is there, the app shows the word plainly rather than a lookalike.
 */
export function Mark({
  size = 132,
  onLongPress,
}: {
  size?: number;
  onLongPress?: () => void;
}) {
  const [missing, setMissing] = useState(false);
  // A ref, not a local: swapping the <img> for the text fallback re-renders this
  // component mid-press, and a render-scoped handle would be lost — so the
  // release could not cancel the timer and a plain tap opened the tray.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const cancel = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = undefined;
    }
  };
  const start = () => {
    if (!onLongPress) return;
    cancel();
    timer.current = setTimeout(onLongPress, 1200);
  };

  useEffect(() => cancel, []);

  const handlers = onLongPress
    ? {
        onPointerDown: start,
        onPointerUp: cancel,
        onPointerLeave: cancel,
        onPointerCancel: cancel,
        onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
      }
    : {};

  if (missing) {
    return (
      <div
        {...handlers}
        aria-label="درع"
        style={{ fontSize: size * 0.55, lineHeight: 1 }}
        className="font-bold tracking-tight select-none"
      >
        درع
      </div>
    );
  }

  return (
    <img
      {...handlers}
      src="/brand/dara-mark.png"
      alt="درع"
      width={size}
      height={size}
      draggable={false}
      onError={() => setMissing(true)}
      className="select-none"
      style={{ width: size, height: "auto" }}
    />
  );
}
