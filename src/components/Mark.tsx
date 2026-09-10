import { useState } from "react";

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
  let timer: ReturnType<typeof setTimeout> | undefined;

  const start = () => {
    if (!onLongPress) return;
    timer = setTimeout(onLongPress, 1200);
  };
  const cancel = () => {
    if (timer) clearTimeout(timer);
  };

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
