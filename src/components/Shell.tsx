import type { ReactNode } from "react";
import { ArrowRight, ChevronRight, Moon, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useI18n } from "../i18n";
import { useTheme } from "../lib/theme";

/* ────────────────────────────────────────────────────────────────────────────
 * The kit. Every screen is assembled from these; no screen styles its own
 * version of one. If something here is wrong it is wrong in one place.
 * ──────────────────────────────────────────────────────────────────────────── */

/**
 * One column, 16px gutters, and enough room at the bottom that the raised Scan
 * button can never sit on top of a page's last control.
 */
export function Page({
  children,
  withNav = true,
}: {
  children: ReactNode;
  withNav?: boolean;
}) {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col bg-paper"
      style={{
        paddingInlineStart: "max(16px, env(safe-area-inset-left))",
        paddingInlineEnd: "max(16px, env(safe-area-inset-right))",
        paddingBottom: withNav
          ? "calc(var(--nav-total) + var(--scan-lift) + 24px)"
          : "max(24px, env(safe-area-inset-bottom))",
      }}
    >
      {children}
    </main>
  );
}

/**
 * A page that paints to the edges. The gutters move inside it, onto whatever
 * needs them.
 */
export function BleedPage({ children }: { children: ReactNode }) {
  return (
    <main
      className="mx-auto flex min-h-dvh w-full max-w-[30rem] flex-col bg-paper"
      style={{ paddingBottom: "calc(var(--nav-total) + var(--scan-lift) + 24px)" }}
    >
      {children}
    </main>
  );
}

/**
 * Cancels the page gutter, so one block can run to the screen edge inside a
 * page that is otherwise inset. The verdict band is the only thing that does.
 */
export function Bleed({ children }: { children: ReactNode }) {
  return (
    <div style={{ marginInline: "calc(-1 * max(16px, env(safe-area-inset-left)))" }}>
      {children}
    </div>
  );
}

/** The 16px gutter, for a block inside a BleedPage. */
export function Gutter({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={`px-4 ${className}`}>{children}</div>;
}

/**
 * Title on the leading side, the two round pills on the trailing one. The 54px
 * above it is the status bar's room: on a phone in standalone the notch sits
 * there, and nothing of ours may.
 */
export function Header({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack?: () => void;
  /** Replaces the language/theme pills — Shield's guided steps put quick exit here. */
  trailing?: ReactNode;
}) {
  const { t } = useI18n();

  return (
    <header
      className="flex items-center gap-2 pb-3"
      style={{ paddingTop: "max(54px, env(safe-area-inset-top))" }}
    >
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t("shield.back")}
          className="tap -ms-1 flex size-8 shrink-0 items-center justify-center text-ink"
        >
          <ChevronRight
            size={22}
            strokeWidth={1.75}
            aria-hidden="true"
            className="rotate-180 rtl:rotate-0"
          />
        </button>
      )}
      <h1 className="t-title min-w-0 flex-1 truncate">{title}</h1>
      {trailing ?? <Pills />}
    </header>
  );
}

/** Language, then theme. 32px each, hairline border. */
export function Pills() {
  const { t, lang, toggle } = useI18n();
  const { theme, toggle: toggleTheme } = useTheme();

  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        className="tap flex size-8 items-center justify-center rounded-full border border-line bg-card text-ink"
      >
        {/* The name is built from both, so what a reader hears contains what a
            sighted user sees — an aria-label alone contradicts the glyph. */}
        <span className="sr-only">{t("a11y.language")}</span>
        <span className="text-[12px] font-bold leading-none">
          {lang === "en" ? "عر" : "EN"}
        </span>
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={t("a11y.theme")}
        className="tap flex size-8 items-center justify-center rounded-full border border-line bg-card text-ink"
      >
        {theme === "light" ? (
          <Moon size={15} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Sun size={15} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

/** Card, radius 18, one hairline, no shadow. The default container. */
export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-card ${padded ? "px-4 py-3.5" : ""} ${className}`}
    >
      {children}
    </div>
  );
}

/** A Card of rows separated by hairlines. Rows are IconRows. */
export function ListCard({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-card border border-line bg-card ${className}`}
    >
      <div className="divide-y divide-line">{children}</div>
    </div>
  );
}

export type IconTone = "neutral" | "amber" | "red";

const ICON_BOX: Record<IconTone, string> = {
  neutral: "bg-line text-ink",
  amber: "bg-line text-amber",
  red: "bg-red-soft text-red",
};

/** The 40px rounded square an IconRow leads with. */
export function IconBox({
  Icon,
  tone = "neutral",
  size = 40,
}: {
  Icon: LucideIcon;
  tone?: IconTone;
  size?: number;
}) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-box ${ICON_BOX[tone]}`}
      style={{ width: size, height: size }}
    >
      <Icon size={Math.round(size / 2)} strokeWidth={1.75} />
    </span>
  );
}

/**
 * The row this app is mostly made of: icon box, title, sub, and whatever the
 * screen needs on the trailing edge — a chevron, a Call pill, a toggle, a
 * radio. 64px minimum, because a thumb is not a mouse.
 */
export function IconRow({
  Icon,
  tone = "neutral",
  title,
  sub,
  lead,
  trailing,
  onClick,
  selected = false,
  as = "row",
  role,
  subDir,
}: {
  Icon?: LucideIcon;
  tone?: IconTone;
  title: ReactNode;
  sub?: ReactNode;
  /** Replaces the icon box — a step number, a red bar, a radio. */
  lead?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  selected?: boolean;
  /** "row" sits inside a ListCard; "card" carries its own border and radius. */
  as?: "row" | "card";
  role?: "radio" | "checkbox";
  /** Set to "auto" when the sub-line is text somebody else wrote. */
  subDir?: "auto";
}) {
  const inner = (
    <>
      {lead ?? (Icon && <IconBox Icon={Icon} tone={tone} />)}
      <span className="min-w-0 flex-1">
        <span className="t-row block">{title}</span>
        {sub !== undefined && sub !== null && (
          <span dir={subDir} className="t-sub mt-0.5 block">
            {sub}
          </span>
        )}
      </span>
      {trailing}
    </>
  );

  const shape =
    as === "card"
      ? `press rounded-row border bg-card px-4 py-3 ${
          selected ? "border-2 border-ink bg-line" : "border-line"
        }`
      : `press px-4 py-3 ${selected ? "bg-line" : ""}`;

  const className = `flex min-h-16 w-full items-center gap-3 text-start ${shape}`;

  if (!onClick) return <div className={className}>{inner}</div>;

  return (
    <button
      type="button"
      onClick={onClick}
      role={role}
      {...(role === "radio"
        ? { "aria-checked": selected }
        : role === "checkbox"
          ? { "aria-checked": selected }
          : { "aria-pressed": selected })}
      className={className}
    >
      {inner}
    </button>
  );
}

/** The chevron an IconRow uses when tapping it opens something. */
export function RowChevron() {
  return (
    <ChevronRight
      size={18}
      strokeWidth={1.75}
      aria-hidden="true"
      className="shrink-0 text-ink-2 rtl:rotate-180"
    />
  );
}

/**
 * Half of a 2×2 grid. The icon sits on the card, not in a tinted chip: four
 * chips in a square is the single most templated thing a phone screen can do,
 * and the icon reads better without one.
 */
export function Tile({
  Icon,
  title,
  sub,
  onClick,
}: {
  Icon: LucideIcon;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press flex min-h-[104px] flex-col items-start rounded-card border border-line bg-card p-4 text-start"
    >
      <Icon size={24} strokeWidth={1.75} className="text-ink" aria-hidden="true" />
      <span className="mt-3.5 block text-[16px] font-extrabold leading-tight tracking-[-0.2px]">
        {title}
      </span>
      <span className="mt-1 block text-[12.5px] font-medium leading-snug text-ink-2">
        {sub}
      </span>
    </button>
  );
}

/** A 34px pill. Selected is ink on a tint; unselected is a hairline on nothing. */
export function Chip({
  Icon,
  label,
  selected,
  onClick,
}: {
  Icon?: LucideIcon;
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`press tap flex h-[34px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-bold ${
        selected
          ? "bg-line text-ink"
          : "border border-line bg-transparent text-ink-2"
      }`}
    >
      {Icon && <Icon size={16} strokeWidth={1.75} aria-hidden="true" />}
      {label}
    </button>
  );
}

/** The rail a Chip row scrolls in. Bleeds to the gutter and pads its end. */
export function ChipRow({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar chip-rail -mx-4 flex gap-2 overflow-x-auto px-4">
      {children}
      <span aria-hidden="true" className="w-3 shrink-0" />
    </div>
  );
}

/**
 * The one red action on a screen, with the arrow that says this goes
 * somewhere.
 * Disabled is a hairline tint with secondary ink on it — visibly not yet,
 * without looking broken. Working keeps the red and draws a line along the
 * top edge.
 */
export function PrimaryButton({
  children,
  onClick,
  disabled,
  loading = false,
  arrow = true,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  arrow?: boolean;
  type?: "button" | "submit";
}) {
  const dimmed = disabled && !loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`relative flex h-[50px] w-full items-center justify-center gap-2 overflow-hidden rounded-btn px-5 text-[16px] font-bold ${
        dimmed ? "bg-line text-ink-2" : "bg-red text-white-brush"
      }`}
    >
      {loading && (
        <span aria-hidden="true" className="absolute inset-x-0 top-0 h-0.5 bg-white/35">
          <span className="progress-line block h-0.5 bg-white" />
        </span>
      )}
      {children}
      {arrow && !loading && (
        <ArrowRight size={18} strokeWidth={1.75} aria-hidden="true" className="rtl:rotate-180" />
      )}
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
      className="flex h-[50px] w-full items-center justify-center rounded-btn border border-line bg-card px-5 text-[16px] font-bold text-ink"
    >
      {children}
    </button>
  );
}

/** 11/800 label. Danger says how a threat arrives; neutral says what one was. */
export function Tag({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger";
}) {
  return (
    <span
      className={`inline-flex items-center rounded-[6px] px-2 py-1 text-[11px] font-extrabold uppercase tracking-[0.02em] ${
        tone === "danger" ? "bg-red-soft text-red-ink" : "bg-line text-ink"
      }`}
    >
      {children}
    </span>
  );
}

export function SectionHeading({ children }: { children: ReactNode }) {
  return <h2 className="t-h3">{children}</h2>;
}

/** The label above a form field, and above a list that needs naming. */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <p className="t-row">{children}</p>;
}

/**
 * Uppercase and tracked. The reference app uses this shape in exactly two
 * places — Scan's "WHAT CAN YOU ANALYZE?" and the danger card's "IN IMMEDIATE
 * DANGER?" — and sentence case everywhere else, which is FieldLabel.
 */
export function SectionLabel({
  children,
  className = "text-ink-2",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p className={`text-[12px] font-extrabold uppercase tracking-[0.08em] ${className}`}>
      {children}
    </p>
  );
}

/** 44×26 for a form row, 40×24 for a checklist row. */
export function Toggle({
  on,
  onChange,
  label,
  small = false,
}: {
  on: boolean;
  onChange: () => void;
  label: string;
  small?: boolean;
}) {
  const w = small ? 40 : 44;
  const h = small ? 24 : 26;
  const knob = h - 6;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onChange}
      className={`press relative shrink-0 rounded-full ${on ? "bg-ink" : "bg-line"}`}
      style={{ width: w, height: h }}
    >
      <span
        className="absolute top-[3px] rounded-full bg-white transition-all duration-150 ease-out"
        style={{
          width: knob,
          height: knob,
          insetInlineStart: on ? w - knob - 3 : 3,
        }}
      />
    </button>
  );
}

export interface StepItem {
  title?: string;
  body: string;
}

/**
 * The numbered vertical stepper Recover and Shield both use. The connector is
 * drawn behind the circles, so a step of any height still joins the next one.
 */
export function Stepper({
  steps,
  firstDanger = false,
}: {
  steps: StepItem[];
  /** The first step of "I lost money to fraud" is the one that cannot wait. */
  firstDanger?: boolean;
}) {
  return (
    <ol className="relative">
      {steps.map((step, index) => {
        const danger = firstDanger && index === 0;
        const last = index === steps.length - 1;
        return (
          <li key={index} className="relative flex gap-3 pb-5 last:pb-0">
            {!last && (
              <span
                aria-hidden="true"
                className="absolute top-7 w-0.5 bg-line"
                style={{ insetInlineStart: 13, bottom: 0 }}
              />
            )}
            <span
              className={`relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full text-[13px] font-extrabold ${
                danger ? "bg-red text-white-brush" : "bg-line text-ink"
              }`}
            >
              <bdi className="tnum">{index + 1}</bdi>
            </span>
            <span className="min-w-0 flex-1 pt-0.5">
              {step.title && <span className="t-row block">{step.title}</span>}
              <span
                className={`block text-[14px] font-medium leading-relaxed text-ink-2 ${
                  step.title ? "mt-1" : ""
                }`}
              >
                {step.body}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
