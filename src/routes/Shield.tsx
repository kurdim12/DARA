import { useState } from "react";
import {
  AlertCircle,
  Banknote,
  EyeOff,
  FileText,
  Image as ImageIcon,
  LockOpen,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { HelpLines } from "../components/HelpLines";
import {
  Card,
  Header,
  IconRow,
  Page,
  PrimaryButton,
  RowChevron,
  SectionLabel,
  Stepper,
} from "../components/Shell";
import { useI18n } from "../i18n";
import { contact, legalLine } from "../lib/verified";
import { situations, type Situation } from "../lib/shield";
import type { Route } from "../lib/router";

const SITUATION_ICON: Record<string, LucideIcon> = {
  private_photos: ImageIcon,
  money_demands: Banknote,
  account_hacked: LockOpen,
  afraid_safety: AlertCircle,
  data_stolen: FileText,
};

/**
 * The extortion shield. Triage first: somebody who opens this screen already
 * knows what happened to them, and the fastest thing the app can do is take
 * them to it in one tap rather than make them pick, then confirm.
 *
 * Quick exit sits at the top of every view here, not only on the steps. It
 * replaces the page rather than pushing, so Back cannot return to it.
 */
export function Shield({
  navigate,
  quickExit,
}: {
  navigate: (route: Route) => void;
  quickExit: () => void;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<Situation | null>(null);

  if (open) {
    return (
      <Steps situation={open} onBack={() => setOpen(null)} onExit={quickExit} navigate={navigate} />
    );
  }

  const emergency = contact("emergency", lang);
  const law = legalLine("cybercrime_law", lang);

  return (
    <>
      <Page>
        <Header title={t("sh.title")} trailing={<QuickExit onExit={quickExit} />} />
        <p className="t-sub -mt-1.5">{t("sh.sub")}</p>

        {/* Triage. One tap from "this happened to me" to what to do about it. */}
        <div className="mt-4 space-y-2">
          {situations(lang).map((situation) => (
            <IconRow
              key={situation.id}
              as="card"
              Icon={SITUATION_ICON[situation.id] ?? AlertCircle}
              title={situation.title}
              sub={situation.summary}
              onClick={() => setOpen(situation)}
              trailing={<RowChevron />}
            />
          ))}
        </div>

        <AnonNote />

        <div className="mt-6 rounded-scanner bg-red px-4 py-4 text-white-brush">
          <SectionLabel className="flex items-center gap-2 text-white-brush">
            <span aria-hidden="true" className="pulse-dot size-2 rounded-full bg-white" />
            {t("shield.danger_title")}
          </SectionLabel>
          <p className="mt-2 text-[15px] font-medium leading-snug">{t("shield.danger_line")}</p>
          {/* The record ships a verified 911, so this is never empty in
              practice — but the type allows null, and silently dropping the
              app's single most important button is not a thing to leave to
              luck. test/contacts.test.ts holds the record to it. */}
          {emergency?.number && (
            <div className="mt-3.5">
              <a
                href={`tel:${emergency.number.replace(/[^\d+]/g, "")}`}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-btn bg-white-brush px-5 text-[16px] font-extrabold text-red"
              >
                <Phone size={18} strokeWidth={1.75} aria-hidden="true" />
                {/* The label states the number it dials, rather than naming one
                    of its own. Both come from the same verified record. */}
                {t("shield.call_now").split("{0}").flatMap((part, index) =>
                  index === 0
                    ? [part]
                    : [
                        <bdi key={index} dir="ltr" className="tnum">
                          {emergency.number}
                        </bdi>,
                        part,
                      ],
                )}
              </a>
            </div>
          )}
        </div>

        <h2 className="t-h3 mt-6">{t("shield.helplines")}</h2>
        <div className="mt-2.5">
          <HelpLines />
        </div>

        <div className="mt-6">
          <PrimaryButton onClick={() => navigate("report")}>{t("sh.report_cta")}</PrimaryButton>
        </div>

        {law && (
          <Card className="mt-6 flex items-start gap-3">
            <FileText size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-2" aria-hidden="true" />
            <p className="t-sub flex-1">{law}</p>
          </Card>
        )}
      </Page>
      <BottomNav active="shield" navigate={navigate} />
    </>
  );
}

/** Leaves without a trace in this tab's history. Present on every shield view. */
function QuickExit({ onExit }: { onExit: () => void }) {
  const { t } = useI18n();
  return (
    <button
      type="button"
      onClick={onExit}
      className="flex h-[34px] shrink-0 items-center rounded-full bg-ink px-3.5 text-[13px] font-bold text-white-brush"
    >
      {t("sh.exit")}
    </button>
  );
}

/** Anonymous by default. The one green line in the app that is not a verdict. */
function AnonNote() {
  const { t } = useI18n();
  return (
    <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-[12.5px] font-semibold leading-snug text-green">
      <EyeOff size={14} strokeWidth={1.75} aria-hidden="true" className="shrink-0" />
      {t("shield.anon_note")}
    </p>
  );
}

/**
 * The guided steps for one situation. Reviewed, fixed text — deliberately not
 * AI, because the person reading it is in no position to judge generated text.
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
        <Header title={situation.title} onBack={onBack} trailing={<QuickExit onExit={onExit} />} />

        <p className="t-body text-ink-2">{situation.intro}</p>

        <p className="t-eyebrow mt-6">{t("rec.steps_title")}</p>
        <div className="mt-3">
          <Stepper steps={situation.steps.map((step) => ({ body: step }))} />
        </div>

        <AnonNote />

        <div className="mt-5 space-y-2.5">
          <PrimaryButton onClick={() => navigate("report")}>{t("sh.report_cta")}</PrimaryButton>
        </div>
      </Page>
      <BottomNav active="shield" navigate={navigate} />
    </>
  );
}
