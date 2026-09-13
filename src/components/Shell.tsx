import type { ReactNode } from "react";
import { Moon, Sun } from "lucide-react";
import { useI18n } from "../i18n";
import { useTheme } from "../lib/theme";
import { Logo } from "./Logo";
import { NAV_CLEARANCE } from "./BottomNav";

/**
 * Every screen sits in this. One column, safe areas respected, the bottom nav
 * cleared when there is one.
 */
export function Page({
  children,
  withNav = true,
}: {
  children: ReactNode;
  withNav?: boolean;
}) {
  return (
    <div
      className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col bg-bg"
      // index.html asks for viewport-fit=cover, so the layout runs under the
      // status bar and the notch. Nothing may sit there.
      style={{
        paddingTop: "max(0.5rem, env(safe-area-inset-top))",
        paddingBottom: withNav ? NAV_CLEARANCE : "max(2rem, env(safe-area-inset-bottom))",
        paddingInlineStart: "max(1rem, env(safe-area-inset-left))",
        paddingInlineEnd: "max(1rem, env(safe-area-inset-right))",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Title on the leading side, or the logo on Home. Two round buttons on the
 * trailing side: language, then theme. Both sides swap with `dir`, which the
 * browser does on its own because the header is a flex row.
 */
export function Header({
  title,
  onLogoLongPress,
}: {
  /** Omit on Home, where the logo takes this place. */
  title?: string;
  onLogoLongPress?: () => void;
}) {
  const { t, lang, toggle } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <header className="flex items-center justify-between gap-3 py-3">
      {title ? <h1 className="text-[22px] font-semibold">{title}</h1> : <Logo onLongPress={onLogoLongPress} />}

      <div className="flex items-center gap-2">
        <RoundButton onClick={toggle} label={t("a11y.language")}>
          <span className="text-[13px] font-semibold leading-none">
            {lang === "en" ? "عر" : "EN"}
          </span>
        </RoundButton>
        <RoundButton onClick={toggleTheme} label={t("a11y.theme")}>
          {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
        </RoundButton>
      </div>
    </header>
  );
}

function RoundButton({
  children,
  onClick,
  label,
}: {
  children: ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-9 items-center justify-center rounded-full border border-line bg-card text-text"
    >
      {children}
    </button>
  );
}

/** The 14px card every block on every screen sits in. */
export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-card border border-line bg-card ${className}`}>{children}</div>
  );
}

/** 13/500, uppercase, tracked — "WHAT CAN YOU ANALYZE?" and its siblings. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[13px] font-medium uppercase tracking-wider text-text-2">{children}</p>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="text-[20px] font-semibold">{children}</h2>;
}

/**
 * Full-width pill. Disabled is `--primary-soft` with white text, which is how
 * the submitted app renders the button before anything has been typed.
 */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  arrow = true,
  tone = "primary",
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  arrow?: boolean;
  tone?: "primary" | "danger";
  type?: "button" | "submit";
}) {
  const fill = disabled
    ? "bg-primary-soft"
    : tone === "danger"
      ? "bg-danger"
      : "bg-primary";
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-full px-5 text-[16px] font-semibold text-white ${fill}`}
    >
      {children}
      {arrow && !disabled && <span aria-hidden="true">→</span>}
    </button>
  );
}

export function OutlineButton({
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
      className="flex min-h-12 w-full items-center justify-center rounded-full border border-line bg-card px-5 text-[16px] font-semibold text-text"
    >
      {children}
    </button>
  );
}
