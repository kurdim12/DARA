import { useState } from "react";
import {
  AlertCircle,
  Banknote,
  ChevronRight,
  EyeOff,
  FileText,
  House,
  Image as ImageIcon,
  LockOpen,
  Monitor,
  Phone,
  Shield as ShieldIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { Card, Header, Page, PrimaryButton, SectionLabel } from "../components/Shell";
import { useI18n } from "../i18n";
import { contact, contacts, legalLine } from "../lib/verified";
import { situations, type Situation } from "../lib/shield";
import type { Route } from "../lib/router";

const HELP_LINE_IDS = ["family_protection", "cybercrime_unit", "emergency"];

const HELP_LINE_ICON: Record<string, LucideIcon> = {
  family_protection: House,
  cybercrime_unit: Monitor,
  emergency: ShieldIcon,
};

const SITUATION_ICON: Record<string, LucideIcon> = {
  private_photos: ImageIcon,
  money_demands: Banknote,
  account_hacked: LockOpen,
  afraid_safety: AlertCircle,
  data_stolen: FileText,
};

const TONE: Record<"primary" | "warn" | "danger", string> = {
  primary: "bg-primary",
  warn: "bg-warn",
  danger: "bg-danger",
};

/** The Call pill's text takes the card's own colour, as the reference does. */
const TONE_TEXT: Record<"primary" | "warn" | "danger", string> = {
  primary: "text-primary",
  warn: "text-warn",
  danger: "text-danger",
};

export function Shield({
  navigate,
  quickExit,
}: {
  navigate: (route: Route) => void;
  quickExit: () => void;
}) {
  const { t, lang } = useI18n();
  const [chosen, setChosen] = useState<Situation | null>(null);
  const [open, setOpen] = useState<Situation | null>(null);

  if (open) return <Steps situation={open} onBack={() => setOpen(null)} onExit={quickExit} navigate={navigate} />;

  const emergency = contact("emergency", lang);
  const law = legalLine("cybercrime_law", lang);
  // Ordered by this list, not by the file: Family Protection first, the
  // police last, which is the order the screen was designed in.
  const byId = new Map(contacts(lang).map((entry) => [entry.id, entry]));
  const lines = HELP_LINE_IDS.map((id) => byId.get(id)).filter((entry) => entry !== undefined);

  return (
    <>
      <Page>
        <Header title={t("shield.title")} />

        <div className="mt-3 rounded-card border border-danger/20 bg-danger-soft px-4 py-3.5">
          <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.04em] text-danger">
            <span aria-hidden="true" className="size-2 rounded-full bg-danger" />
            {t("shield.danger_title")}
          </p>
          <p className="mt-2 text-[15px] leading-snug">{t("shield.danger_line")}</p>
          <div className="mt-3.5">
            {emergency?.number ? (
              <a
                href={`tel:${emergency.number.replace(/\s/g, "")}`}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-danger px-5 text-[16px] font-semibold text-white"
              >
                <Phone size={18} strokeWidth={1.75} aria-hidden="true" />
                {t("shield.call_now")}
              </a>
            ) : (
              // No number has been checked against an official source, so there
              // is nothing to dial. The card still says what it is for.
              <p className="flex h-12 w-full items-center justify-center rounded-full border border-warn px-5 text-[14px] font-semibold text-warn">
                {t("shield.pending_emergency")}
              </p>
            )}
          </div>
        </div>

        <div className="mt-7">
          <SectionLabel>{t("shield.helplines")}</SectionLabel>
        </div>
        <div className="mt-2.5 space-y-2.5">
          {lines.map((line) => {
            const Icon = HELP_LINE_ICON[line.id] ?? ShieldIcon;
            return (
              <div
                key={line.id}
                className={`flex min-h-[72px] items-center gap-3 rounded-card px-4 py-3.5 text-white ${TONE[line.tone]}`}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-white/20">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-[17px] font-bold leading-snug">{line.label}</span>
                  <span className="mt-0.5 block text-[14px] text-white/85">
                    {line.number ? <bdi>{line.number}</bdi> : t("shield.pending_number")}
                  </span>
                </span>
                {line.number && (
                  <a
                    href={`tel:${line.number.replace(/\s/g, "")}`}
                    className={`flex h-[34px] shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-[14px] font-semibold ${TONE_TEXT[line.tone]}`}
                  >
                    <Phone size={15} strokeWidth={1.75} aria-hidden="true" />
                    {t("shield.call")}
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-7 flex items-center gap-3">
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
          <span className="text-[13px] text-text-2">{t("shield.or_guidance")}</span>
          <span aria-hidden="true" className="h-px flex-1 bg-line" />
        </div>

        <div className="mt-7">
          <SectionLabel>{t("shield.what_happened")}</SectionLabel>
          <p className="mt-1 text-[13px] text-text-2">{t("shield.what_sub")}</p>
        </div>
        <div className="mt-2.5 space-y-2.5">
          {situations(lang).map((situation) => {
            const selected = chosen?.id === situation.id;
            const Icon = SITUATION_ICON[situation.id] ?? AlertCircle;
            return (
              <button
                key={situation.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setChosen(situation)}
                className={`flex min-h-16 w-full items-center gap-3 rounded-card px-4 py-3 text-start ${
                  selected ? "border-2 border-primary bg-primary-soft" : "border border-line bg-card"
                }`}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary">
                  <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <span className="flex-1">
                  <span className="block text-[16px] font-semibold leading-snug">
                    {situation.title}
                  </span>
                  <span className="mt-0.5 block text-[14px] leading-snug text-text-2">
                    {situation.summary}
                  </span>
                </span>
                <ChevronRight
                  size={18}
                  strokeWidth={1.75}
                  aria-hidden="true"
                  className="shrink-0 text-text-2 rtl:rotate-180"
                />
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <PrimaryButton disabled={!chosen} onClick={() => setOpen(chosen)}>
            {t("shield.get_help")}
          </PrimaryButton>
        </div>

        <p className="mt-3 text-center text-[13px] leading-snug text-success">
          <EyeOff
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="me-1.5 inline align-[-2px]"
          />
          {t("shield.anon_note")}
        </p>

        {law && (
          <Card className="mt-7 flex items-start gap-3 px-4 py-3.5">
            <FileText size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-[14px] leading-snug text-text-2">{law}</p>
          </Card>
        )}
      </Page>
      <BottomNav active="shield" navigate={navigate} />
    </>
  );
}

/**
 * The guided steps for one situation. Reviewed, fixed text — deliberately not
 * AI, because the person reading it is in no position to judge generated text.
 *
 * Quick exit is kept from the previous build: it replaces the page rather than
 * pushing, so Back cannot return here.
 */
function Steps({
  situation,
  onBack,
  onExit,
  navigate,
}: {
  situation: Situation;
  onBack: () => void;
  onExit: () => void;
  navigate: (route: Route) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <Page>
        <div className="flex items-center justify-between py-3">
          <button type="button" onClick={onBack} className="tap text-[15px] text-text-2">
            {t("shield.back")}
          </button>
          <button
            type="button"
            onClick={onExit}
            className="min-h-9 rounded-full border border-line px-3 text-[14px] font-semibold"
          >
            {t("shield.exit")}
          </button>
        </div>

        <h1 className="mt-1 text-[20px] font-semibold">{situation.title}</h1>
        <p className="mt-2 leading-snug text-text-2">{situation.intro}</p>

        <div className="mt-6">
          <SectionLabel>{t("shield.steps_label")}</SectionLabel>
        </div>
        <Card className="mt-2.5 divide-y divide-line">
          {situation.steps.map((step, index) => (
            <div key={index} className="flex gap-3 px-4 py-3.5">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary">
                <bdi>{index + 1}</bdi>
              </span>
              <p className="text-[15px] leading-snug">{step}</p>
            </div>
          ))}
        </Card>

        <p className="mt-6 text-center text-[13px] leading-snug text-success">
          <EyeOff
            size={14}
            strokeWidth={1.75}
            aria-hidden="true"
            className="me-1.5 inline align-[-2px]"
          />
          {t("shield.anon_note")}
        </p>

        <div className="mt-5">
          <PrimaryButton onClick={() => navigate("report")}>{t("report.title")}</PrimaryButton>
        </div>
      </Page>
      <BottomNav active="shield" navigate={navigate} />
    </>
  );
}
