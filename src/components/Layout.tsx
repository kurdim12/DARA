import type { ReactNode } from "react";
import { useI18n } from "../i18n";

export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[46rem] px-5 pb-16 pt-2">
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
      className="border-b border-ink-20 pb-0.5 text-base text-ink-70"
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
