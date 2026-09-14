import { useState } from "react";
import { Check, X } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import {
  Card,
  Header,
  OutlineButton,
  Page,
  PrimaryButton,
  Tag,
} from "../components/Shell";
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
          <div className="reveal mt-10 text-center">
            <p className="t-sub">{t("learn.your_score")}</p>
            <p className="tnum mt-2 text-[28px] font-extrabold leading-none">
              <bdi>
                {score} / {set.length}
              </bdi>
            </p>
          </div>
          <div className="mt-8 space-y-2.5">
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
        <p className="t-sub -mt-1">{t("tool.learn_sub")}</p>

        {/* Six dots. Where you are, and how much is left, without a number. */}
        <div
          className="mt-5 flex items-center gap-1.5"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={set.length}
          aria-valuenow={index + 1}
          aria-label={t("learn.question")}
        >
          {set.map((item, dot) => (
            <span
              key={item.id}
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${dot === index ? "bg-blue" : "bg-line"}`}
            />
          ))}
        </div>

        {/* A quiz message is quoted text, never a link — the same rule the
            verdict screen follows for the message being analysed. */}
        <Card className="mt-3">
          <Tag>{t("type.message")}</Tag>
          <p
            dir="auto"
            className="mt-2.5 whitespace-pre-wrap break-words rounded-btn bg-mist p-3.5 text-[15px] font-medium leading-relaxed"
          >
            {question.message}
          </p>
        </Card>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <ChoiceButton
            label={t("learn.scam")}
            tone="red"
            chosen={given === "scam"}
            locked={Boolean(given)}
            onClick={() => answer("scam")}
          />
          <ChoiceButton
            label={t("learn.legitimate")}
            tone="green"
            chosen={given === "legitimate"}
            locked={Boolean(given)}
            onClick={() => answer("legitimate")}
          />
        </div>

        {given && (
          <div className="reveal mt-5">
            <p
              className={`t-row flex items-center gap-2 ${right ? "text-green" : "text-red-ink"}`}
            >
              {right ? (
                <Check size={18} strokeWidth={2.25} aria-hidden="true" />
              ) : (
                <X size={18} strokeWidth={2.25} aria-hidden="true" />
              )}
              {t(right ? "learn.correct" : "learn.incorrect")}
            </p>
            <Card className="mt-2.5">
              <p className="t-row">{t("learn.tell")}</p>
              <p dir="auto" className="t-body mt-1.5">
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

/** Outline until it is chosen, then filled in its own colour. */
function ChoiceButton({
  label,
  tone,
  chosen,
  locked,
  onClick,
}: {
  label: string;
  tone: "red" | "green";
  chosen: boolean;
  locked: boolean;
  onClick: () => void;
}) {
  const outline = tone === "red" ? "border-red text-red-ink" : "border-green text-green";
  const filled = tone === "red" ? "bg-red-fill text-white" : "bg-green-fill text-white";
  return (
    <button
      type="button"
      disabled={locked}
      onClick={onClick}
      className={`press h-[50px] rounded-btn border text-[16px] font-bold ${
        chosen ? `border-transparent ${filled}` : `bg-card ${outline}`
      }`}
    >
      {label}
    </button>
  );
}
