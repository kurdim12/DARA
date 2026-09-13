import { useState } from "react";
import { resolveContact, shieldContent } from "../lib/content";
import { sendReport } from "../lib/api";
import { CaseNumber } from "../components/CaseNumber";
import { isTestMode, rememberCase } from "../lib/storage";
import {
  Page,
  PrimaryButton,
  QuietButton,
  SectionTitle,
} from "../components/Layout";
import { useI18n } from "../i18n";

type Answer = "unanswered" | "yes" | "safe_now";

/**
 * Guided, reviewed content — deliberately not AI. A victim of blackmail gets
 * fixed steps that a person wrote and checked, never generated text.
 */
export function Shield({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const { t, lang } = useI18n();
  const [answer, setAnswer] = useState<Answer>("unanswered");
  const [stage, setStage] = useState<"steps" | "report" | "done">("steps");
  const [caseNumber, setCaseNumber] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function report() {
    setSending(true);
    setFailed(false);
    try {
      const response = await sendReport({
        source: "shield",
        category: "extortion",
        is_test: isTestMode(),
      });
      rememberCase(response.case_number, response.status);
      setCaseNumber(response.case_number);
      setStage("done");
    } catch {
      setFailed(true);
    } finally {
      setSending(false);
    }
  }

  // Quick exit stays reachable on every Shield screen, not just at the top.
  const exitBar = (
    <div
      className="sticky top-0 z-10 flex justify-between bg-paper py-3"
      style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
    >
      <button type="button" onClick={onHome} className="tap text-ink-70">
        {t("shield.back")}
      </button>
      <button
        type="button"
        onClick={onExit}
        className="inline-flex min-h-11 items-center border-2 border-ink px-3 text-base font-semibold"
      >
        {t("shield.exit")}
      </button>
    </div>
  );

  if (stage === "done" && caseNumber) {
    return (
      <Page>
        {exitBar}
        <p className="mt-14 text-2xl leading-snug">{t("report.done")}</p>
        <CaseNumber value={caseNumber} />
        <p className="mt-5 text-lg">{t("report.keep")}</p>
        <p className="mt-2 text-lg">{t("report.status")}</p>
        <p className="mt-8 text-sm text-ink-55">{t("report.pilot")}</p>
        <div className="mt-10">
          <QuietButton onClick={onHome}>{t("report.close")}</QuietButton>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      {exitBar}

      <h1 className="mt-6 text-3xl font-bold">{t("shield.title")}</h1>
      <p className="mt-5 text-xl leading-snug">{shieldContent.intro(lang)}</p>

      <section className="mt-10">
        <p className="text-xl font-semibold">{shieldContent.question(lang)}</p>
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => setAnswer("yes")}
            className={`flex-1 border-2 px-4 py-3 text-lg font-semibold ${
              answer === "yes" ? "border-threat bg-threat text-paper" : "border-threat text-threat"
            }`}
          >
            {t("shield.yes")}
          </button>
          <button
            type="button"
            onClick={() => setAnswer("safe_now")}
            className={`flex-1 border-2 px-4 py-3 text-lg font-semibold ${
              answer === "safe_now" ? "border-ink bg-ink text-paper" : "border-ink text-ink"
            }`}
          >
            {t("shield.no")}
          </button>
        </div>

        {answer === "yes" && (
          <div className="mt-5 border-s-4 border-threat ps-4">
            <p className="text-lg">{shieldContent.ifYes(lang)}</p>
            {shieldContent.yesContacts.map((id) => {
              const contact = resolveContact(id, lang);
              if (!contact) return null;
              return (
                <p key={id} className="mt-2 text-lg font-semibold">
                  {contact.label}
                  {contact.number && (
                    <>
                      {" "}
                      <bdi>{contact.number}</bdi>
                    </>
                  )}
                  {contact.needsVerification && import.meta.env.DEV && (
                    <span className="ms-2 border border-threat px-1.5 text-xs text-threat">
                      VERIFY
                    </span>
                  )}
                </p>
              );
            })}
          </div>
        )}

        {answer === "safe_now" && (
          <ul className="mt-5 space-y-2 border-s-2 border-ink-20 ps-4 text-lg">
            {shieldContent.ifSafeNow(lang).map((line, index) => (
              <li key={index}>{line}</li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-11">
        <SectionTitle>{t("shield.steps_title")}</SectionTitle>
        <ol className="divide-y divide-ink-12 border-y border-ink-12">
          {shieldContent.steps(lang).map((step, index) => (
            <li key={step.id} className="flex gap-4 py-4">
              <span className="font-bold text-ink-55">
                <bdi>{index + 1}</bdi>
              </span>
              <span className="text-lg leading-snug">{step.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <p className="mt-9 text-lg leading-snug">{shieldContent.reassurance(lang)}</p>
      {shieldContent.legalNote(lang) && (
        <p className="mt-2 text-lg leading-snug">
          {shieldContent.legalNote(lang)}
          {shieldContent.legalNoteNeedsVerification && import.meta.env.DEV && (
            <span className="ms-2 border border-threat px-1.5 text-xs text-threat">VERIFY</span>
          )}
        </p>
      )}

      {failed && (
        <p role="alert" className="mt-6 border-s-4 border-threat ps-3">
          {t("error.generic")}
        </p>
      )}

      <div className="mt-8">
        <PrimaryButton threat onClick={report} disabled={sending || stage === "report"}>
          {sending ? t("report.sending") : t("report.cta")}
        </PrimaryButton>
      </div>
      <p className="mt-4 text-sm text-ink-55">{t("report.privacy")}</p>
      <p className="mt-1 text-sm text-ink-55">{t("report.pilot")}</p>
    </Page>
  );
}
