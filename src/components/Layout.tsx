import type { ReactNode } from "react";
import { useI18n } from "../i18n";
import { NAV_CLEARANCE } from "./BottomNav";

export function Page({
  children,
  withNav,
}: {
  children: ReactNode;
  /** Set on the four primary destinations so content clears the bottom nav. */
  withNav?: boolean;
}) {
  return (
    <div
      // A flex column so a screen can hand its spare height to a child with
      // `my-auto` instead of leaving it all in one gap above the nav. Auto
      // margins collapse when content is tall, so nothing can be clipped.
      className="mx-auto flex min-h-dvh w-full max-w-[46rem] flex-col"
      // index.html asks for viewport-fit=cover, so the layout runs under the
      // status bar and the notch. Nothing may sit there.
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingBottom: withNav
          ? NAV_CLEARANCE
          : "max(4rem, env(safe-area-inset-bottom))",
        paddingInlineStart: "max(1.25rem, env(safe-area-inset-left))",
        paddingInlineEnd: "max(1.25rem, env(safe-area-inset-right))",
      }}
    >
      {children}
    </div>
  );
}

export function LangToggle() {
  const { t, toggle } = useI18n();
  return (
    <button
      type="button"
      onClick={toggle}
      className="tap border-b border-ink-20 pb-0.5 text-base text-ink-70"
    >
      {t("app.lang_toggle")}
    </button>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  threat,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  /** Red is reserved for threat actions: report, and the Shield entry. */
  threat?: boolean;
  type?: "button" | "submit";
}) {
  const base =
    "w-full px-5 py-4 text-xl font-semibold disabled:opacity-35 disabled:cursor-not-allowed";
  const skin = threat ? "bg-threat text-paper" : "bg-ink text-paper";
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${skin}`}>
      {children}
    </button>
  );
}

export function QuietButton({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full border-2 border-ink px-5 py-3 text-lg font-semibold text-ink"
    >
      {children}
    </button>
  );
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="mb-2 text-sm font-semibold uppercase tracking-widest text-ink-55">
      {children}
    </h2>
  );
}
