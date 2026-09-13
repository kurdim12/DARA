import { useEffect, useRef, useState } from "react";
import {
  Briefcase,
  ClipboardPaste,
  Globe,
  Link2,
  MessageSquare,
  Phone,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ANALYSIS_TYPES, MAX_INPUT_CHARS, type AnalysisType, type AnalyzeResponse } from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { HighlightedMessage } from "../components/HighlightedMessage";
import {
  Card,
  Header,
  OutlineButton,
  Page,
  PrimaryButton,
  SectionLabel,
} from "../components/Shell";
import { analyze, AppError } from "../lib/api";
import { LEVEL_LABEL, LEVEL_TONE, levelFor } from "../lib/level";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

/** Eight characters is short enough for a phone number, long enough to mean something. */
const MIN_INPUT = 8;

const TYPES: Record<AnalysisType, { label: TextKey; placeholder: TextKey; Icon: LucideIcon }> = {
  message: { label: "type.message", placeholder: "scan.ph_message", Icon: MessageSquare },
  link: { label: "type.link", placeholder: "scan.ph_link", Icon: Link2 },
  call: { label: "type.call", placeholder: "scan.ph_call", Icon: Phone },
  job: { label: "type.job", placeholder: "scan.ph_job", Icon: Briefcase },
  website: { label: "type.website", placeholder: "scan.ph_website", Icon: Globe },
};

const WHAT: TextKey[] = [
  "scan.what_1",
  "scan.what_2",
  "scan.what_3",
  "scan.what_4",
  "scan.what_5",
];

const WHAT_ICONS: LucideIcon[] = [MessageSquare, Link2, Phone, Briefcase, Globe];

type Stage =
  | { name: "input" }
  | { name: "loading" }
  | { name: "result"; result: AnalyzeResponse; input: string };

export function Scan({
  navigate,
  seed,
  onSeedUsed,
}: {
  navigate: (route: Route) => void;
  /** Text carried over from Home, and whether to check it straight away. */
  seed: { text: string; run: boolean } | null;
  onSeedUsed: () => void;
}) {
  const { t, lang } = useI18n();
  const [type, setType] = useState<AnalysisType>("message");
  const [text, setText] = useState("");
  const [stage, setStage] = useState<Stage>({ name: "input" });
  const [errorKey, setErrorKey] = useState<TextKey | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!seed || ran.current) return;
    ran.current = true;
    setText(seed.text);
    onSeedUsed();
    if (seed.run) void run(seed.text);
    // run() is stable for this purpose; re-running on every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  async function run(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < MIN_INPUT) return;
    setErrorKey(null);
    setStage({ name: "loading" });
    try {
      const result = await analyze(trimmed, lang, undefined, undefined, type);
      setStage({ name: "result", result, input: trimmed });
    } catch (error) {
      setErrorKey(error instanceof AppError ? error.key : "error.generic");
      setStage({ name: "input" });
    }
  }

  async function paste() {
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip.slice(0, MAX_INPUT_CHARS));
    } catch {
      // Clipboard access is refused on some browsers. Typing still works.
    }
  }

  if (stage.name === "result") {
    return (
      <Result
        result={stage.result}
        input={stage.input}
        navigate={navigate}
        onAgain={() => {
          setText("");
          setStage({ name: "input" });
        }}
      />
    );
  }

  const busy = stage.name === "loading";

  return (
    <>
      <Page>
        <Header title={t("scan.title")} />

        {busy && (
          <div className="mt-1 h-0.5 w-full overflow-hidden rounded-full bg-line">
            <div className="scan-line h-0.5 bg-primary" />
          </div>
        )}

        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4">
          {ANALYSIS_TYPES.map((option) => {
            const { label, Icon } = TYPES[option];
            const selected = option === type;
            return (
              <button
                key={option}
                type="button"
                onClick={() => setType(option)}
                aria-pressed={selected}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-[14px] font-medium ${
                  selected
                    ? "border-primary bg-primary text-white"
                    : "border-line bg-card text-text-2"
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                {t(label)}
              </button>
            );
          })}
        </div>

        <Card className="mt-4 p-4">
          <textarea
            dir={text.length > 0 ? "auto" : undefined}
            value={text}
            disabled={busy}
            maxLength={MAX_INPUT_CHARS}
            onChange={(e) => setText(e.target.value)}
            placeholder={t(TYPES[type].placeholder)}
            rows={6}
            className="w-full resize-none bg-transparent text-[16px] leading-relaxed outline-none placeholder:text-text-2"
          />
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <button
              type="button"
              onClick={paste}
              className="flex min-h-9 items-center gap-2 rounded-full border border-line px-3 text-[13px] font-medium text-text-2"
            >
              <ClipboardPaste size={16} aria-hidden="true" />
              {t("scan.paste")}
            </button>
            <span className="text-[13px] text-text-2">
              <bdi>
                {text.length} / {MAX_INPUT_CHARS}
              </bdi>
            </span>
          </div>
        </Card>

        {errorKey && (
          <p role="alert" className="mt-4 rounded-card bg-danger-soft p-3 text-[14px] text-danger">
            {t(errorKey)}
          </p>
        )}

        <div className="mt-4">
          <PrimaryButton
            disabled={busy || text.trim().length < MIN_INPUT}
            arrow={!busy}
            onClick={() => void run(text)}
          >
            {busy ? t("scan.analyzing") : t("home.analyze")}
          </PrimaryButton>
        </div>

        <Card className="mt-8 p-4">
          <SectionLabel>{t("scan.what")}</SectionLabel>
          <ul className="mt-3 space-y-3">
            {WHAT.map((key, index) => {
              const Icon = WHAT_ICONS[index];
              return (
                <li key={key} className="flex items-center gap-3 text-[14px]">
                  <Icon size={20} className="shrink-0 text-primary" aria-hidden="true" />
                  {t(key)}
                </li>
              );
            })}
          </ul>
        </Card>
      </Page>
      <BottomNav active="scan" navigate={navigate} />
    </>
  );
}

function Result({
  result,
  input,
  navigate,
  onAgain,
}: {
  result: AnalyzeResponse;
  input: string;
  navigate: (route: Route) => void;
  onAgain: () => void;
}) {
  const { t } = useI18n();
  const level = levelFor(result);
  const tone = LEVEL_TONE[level];

  return (
    <>
      <Page>
        <Header title={t("scan.title")} />

        <Card className={`fade-in mt-4 border-s-[3px] p-5 ${tone.border} ${tone.soft}`}>
          <p className={`text-[28px] font-bold leading-tight ${tone.text}`}>
            {t(LEVEL_LABEL[level])}
          </p>
          <p dir="auto" className="mt-2 leading-snug">
            {result.headline}
          </p>
        </Card>

        <Card className="mt-4 p-4">
          <SectionLabel>{t("result.input")}</SectionLabel>
          <div className="mt-3">
            <HighlightedMessage text={input} flags={result.red_flags} />
          </div>

          {result.red_flags.length > 0 && (
            <>
              <div className="mt-5">
                <SectionLabel>{t("result.why")}</SectionLabel>
              </div>
              <ol className="mt-3 space-y-3">
                {result.red_flags.map((flag, index) => (
                  <li key={index} className="flex gap-3 text-[15px] leading-snug">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-danger-soft text-[12px] font-bold text-danger">
                      <bdi>{index + 1}</bdi>
                    </span>
                    <span dir="auto">{flag.why}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </Card>

        {result.actions.length > 0 && (
          <Card className="mt-4 p-4">
            <SectionLabel>{t("result.what_now")}</SectionLabel>
            <ul className="mt-3 space-y-3">
              {result.actions.map((action, index) => (
                <li key={index} dir="auto" className="text-[15px] leading-snug">
                  {action}
                </li>
              ))}
            </ul>
          </Card>
        )}

        <div className="mt-6 space-y-3">
          <PrimaryButton onClick={() => navigate("report")}>
            {t("result.report_cta")}
          </PrimaryButton>
          <OutlineButton onClick={onAgain}>{t("result.scan_another")}</OutlineButton>
        </div>

        <p className="mt-5 flex items-center gap-2 text-[13px] text-text-2">
          <span>{t("result.powered")}</span>
          {result.cached && (
            <span className="rounded-full border border-line px-2 py-0.5">
              {t("result.saved")}
            </span>
          )}
        </p>
      </Page>
      <BottomNav active="scan" navigate={navigate} />
    </>
  );
}
