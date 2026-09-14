import { useState } from "react";
import { Check, X } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { Card, Header, OutlineButton, Page, PrimaryButton, SectionLabel } from "../components/Shell";
import { useI18n } from "../i18n";
import { questions, type Question } from "../lib/plans";
import type { Route } from "../lib/router";

type Answer = "scam" | "legitimate";

/**
 * Six questions, no timer and no leaderboard. Half of them are legitimate
 * messages on purpose: a quiz that is mostly scams teaches people to answer
 * scam, which is the opposite of the point.
 */
export function Learn({ navigate }: { navigate: (route: Route) => void }) {
  const { t, lang } = useI18n();
  const [set] = useState<Question[]>(() => questions(lang));
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<Answer | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  const question = set[index];
  const last = index === set.length - 1;

  function answer(choice: Answer) {
    if (given) return;
    setGiven(choice);
    if (choice === question.answer) setScore((prev) => prev + 1);
  }

  function next() {
    if (last) {
      setDone(true);
      return;
    }
    setIndex((prev) => prev + 1);
    setGiven(null);
  }

  function restart() {
    setIndex(0);
    setGiven(null);
    setScore(0);
    setDone(false);
  }

  if (done) {
    return (
      <>
        <Page>
          <Header title={t("tool.learn")} />
          <div className="fade-in mt-12 text-center">
            <p className="text-[13px] font-medium uppercase tracking-wider text-text-2">
              {t("learn.your_score")}
            </p>
            <p className="mt-2 text-[44px] font-bold leading-none">
              <bdi>
                {score} / {set.length}
              </bdi>
            </p>
          </div>
          <div className="mt-10 space-y-3">
            <PrimaryButton onClick={() => navigate("scan")}>{t("learn.try_scanner")}</PrimaryButton>
            <OutlineButton onClick={restart}>{t("learn.restart")}</OutlineButton>
          </div>
        </Page>
        <BottomNav active="home" navigate={navigate} />
      </>
    );
  }

  const right = given === question.answer;

  return (
    <>
      <Page>
        <Header title={t("tool.learn")} />
        <p className="mt-0.5 text-[14px] text-text-2">{t("tool.learn_sub")}</p>

        <div className="mt-5 flex items-center gap-3">
          <SectionLabel>
            {t("learn.question")} <bdi>{index + 1}</bdi> / <bdi>{set.length}</bdi>
          </SectionLabel>
          <span className="h-1 flex-1 rounded-full bg-line">
            <span
              className="block h-1 rounded-full bg-primary transition-all"
              style={{ width: `${((index + (given ? 1 : 0)) / set.length) * 100}%` }}
            />
          </span>
        </div>

        {/* A quiz message is quoted text, never a link — the same rule the
            verdict screen follows for the message being analysed. */}
        <Card className="mt-2.5 px-4 py-3.5">
          <p dir="auto" className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
            {question.message}
          </p>
        </Card>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            disabled={Boolean(given)}
            onClick={() => answer("scam")}
            className={`h-[50px] rounded-full border text-[15px] font-semibold ${
              given === "scam"
                ? "border-primary bg-primary text-white"
                : "border-line bg-card text-text"
            }`}
          >
            {t("learn.scam")}
          </button>
          <button
            type="button"
            disabled={Boolean(given)}
            onClick={() => answer("legitimate")}
            className={`min-h-12 rounded-full border text-[15px] font-semibold ${
              given === "legitimate"
                ? "border-primary bg-primary text-white"
                : "border-line bg-card text-text"
            }`}
          >
            {t("learn.legitimate")}
          </button>
        </div>

        {given && (
          <div className="fade-in mt-5">
            <p
              className={`flex items-center gap-2 font-semibold ${
                right ? "text-success" : "text-danger"
              }`}
            >
              {right ? <Check size={18} strokeWidth={1.75} aria-hidden="true" /> : <X size={18} strokeWidth={1.75} aria-hidden="true" />}
              {t(right ? "learn.correct" : "learn.incorrect")}
            </p>
            <Card className="mt-2.5 px-4 py-3.5">
              <SectionLabel>{t("learn.tell")}</SectionLabel>
              <p dir="auto" className="mt-2 text-[15px] leading-snug">
                {question.tell}
              </p>
            </Card>
            <div className="mt-5">
              <PrimaryButton onClick={next}>
                {t(last ? "learn.finish" : "learn.next")}
              </PrimaryButton>
            </div>
          </div>
        )}
      </Page>
      <BottomNav active="home" navigate={navigate} />
    </>
  );
}
