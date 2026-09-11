import { useEffect, useRef, useState } from "react";
import {
  CHANNELS,
  MAX_INPUT_CHARS,
  type AnalyzeResponse,
  type Channel,
} from "../../shared/types";
import { analyze, AppError, sendReport } from "../lib/api";
import { isTestMode, rememberCase } from "../lib/storage";
import { HighlightedMessage } from "../components/HighlightedMessage";
import { VerdictBand } from "../components/VerdictBand";
import {
  LangToggle,
  Page,
  PrimaryButton,
  QuietButton,
  SectionTitle,
} from "../components/Layout";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

type Stage =
  | { name: "input" }
  | { name: "loading" }
  | { name: "verdict"; result: AnalyzeResponse }
  | { name: "report"; result: AnalyzeResponse }
  | { name: "done"; caseNumber: string };

/**
 * What the person is holding, not what the app does with it. Everything still
 * goes to the same analyze endpoint as text — the mode only shapes the input
 * and, for a call, the channel.
 */
type InputMode = "text" | "link" | "image" | "call";

const MODES: { id: InputMode; enabled: boolean }[] = [
  { id: "text", enabled: true },
  { id: "link", enabled: true },
  // The engine reads text. There is no OCR behind this, so it is not offered.
  { id: "image", enabled: false },
  { id: "call", enabled: true },
];

const PLACEHOLDER: Record<Exclude<InputMode, "image">, TextKey> = {
  text: "detect.placeholder",
  link: "detect.placeholder_link",
  call: "detect.placeholder_call",
};

export function Detect({
  navigate,
  seedText,
  onSeedUsed,
}: {
  navigate: (route: Route) => void;
  seedText: string | null;
  onSeedUsed: () => void;
}) {
  const { t, lang } = useI18n();
  const [text, setText] = useState("");
  const [mode, setMode] = useState<InputMode>("text");
  const [channel, setChannel] = useState<Channel>("sms");
  const [stage, setStage] = useState<Stage>({ name: "input" });
  const [errorKey, setErrorKey] = useState<TextKey | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);

  // A call is a call whatever the chips say; a link arrived by no channel we
  // asked about, so none is claimed.
  const effectiveChannel: Channel | undefined =
    mode === "call" ? "call" : mode === "link" ? undefined : channel;

  const focusInput = () =>
    mode === "link" ? linkRef.current?.focus() : boxRef.current?.focus();

  // A message picked from the demo tray lands in the box, unsent.
  useEffect(() => {
    if (seedText === null) return;
    setText(seedText);
    setMode("text");
    setStage({ name: "input" });
    setErrorKey(null);
    onSeedUsed();
  }, [seedText, onSeedUsed]);

  async function onPaste() {
    setErrorKey(null);
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip.slice(0, MAX_INPUT_CHARS));
      else focusInput();
    } catch {
      // Clipboard read is blocked on plenty of phones; say so and move on.
      setErrorKey("detect.paste_failed");
      focusInput();
    }
  }

  async function onCheck() {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX_INPUT_CHARS) {
      setErrorKey("error.too_long");
      return;
    }
    setErrorKey(null);
    setStage({ name: "loading" });
    try {
      const result = await analyze(trimmed, lang, effectiveChannel);
      setStage({ name: "verdict", result });
    } catch (error) {
      setErrorKey(error instanceof AppError ? error.key : "error.generic");
      setStage({ name: "input" });
    }
  }

  function reset() {
    setText("");
    setErrorKey(null);
    setStage({ name: "input" });
  }

  if (stage.name === "verdict") {
    return (
      <VerdictScreen
        result={stage.result}
        text={text.trim()}
        onReport={() => setStage({ name: "report", result: stage.result })}
        onShield={() => navigate("shield")}
        onAgain={reset}
      />
    );
  }

  if (stage.name === "report") {
    return (
      <ReportSheet
        result={stage.result}
        text={text.trim()}
        channel={effectiveChannel}
        onCancel={() => setStage({ name: "verdict", result: stage.result })}
        onDone={(caseNumber) => setStage({ name: "done", caseNumber })}
      />
    );
  }

  if (stage.name === "done") {
    return <ReportDone caseNumber={stage.caseNumber} onClose={() => navigate("home")} />;
  }

  const busy = stage.name === "loading";

  return (
    <Page>
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => navigate("home")} className="text-ink-70">
          {t("shield.back")}
        </button>
        <LangToggle />
      </header>

      <h1 className="mt-6 text-3xl font-bold">{t("detect.title")}</h1>
      <p className="mt-1.5 text-base text-ink-70">{t("detect.subtitle")}</p>

      {/* What you are holding. Plain tabs, no icons, and never red — red is
          reserved for a threat, and choosing an input is not one. */}
      <div className="mt-6 flex flex-wrap gap-2">
        {MODES.map(({ id, enabled }) => {
          const active = mode === id;
          if (!enabled) {
            return (
              <button
                key={id}
                type="button"
                disabled
                aria-disabled="true"
                className="cursor-not-allowed border border-ink-12 px-3 py-1.5 text-base text-ink-55"
              >
                {t(`mode.${id}` as TextKey)}
                <span className="ms-1.5 text-xs">{t("mode.soon")}</span>
              </button>
            );
          }
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => {
                setMode(id);
                setErrorKey(null);
              }}
              className={`border px-3 py-1.5 text-base ${
                active ? "border-ink bg-ink text-paper" : "border-ink-20 text-ink-70"
              }`}
            >
              {t(`mode.${id}` as TextKey)}
            </button>
          );
        })}
      </div>

      {mode === "link" ? (
        <input
          ref={linkRef}
          type="text"
          inputMode="url"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          dir="auto"
          value={text}
          disabled={busy}
          maxLength={MAX_INPUT_CHARS}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("detect.placeholder_link")}
          className="mt-5 w-full border-2 border-ink bg-paper p-4 text-lg placeholder:text-ink-55"
        />
      ) : (
        <textarea
          ref={boxRef}
          dir="auto"
          value={text}
          disabled={busy}
          maxLength={MAX_INPUT_CHARS}
          onChange={(e) => setText(e.target.value)}
          placeholder={t(PLACEHOLDER[mode === "call" ? "call" : "text"])}
          rows={6}
          className="mt-5 w-full resize-y border-2 border-ink bg-paper p-4 text-lg leading-relaxed placeholder:text-ink-55"
        />
      )}

      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={onPaste} className="border-b border-ink pb-0.5">
          {t("detect.paste")}
        </button>
        {mode !== "link" && (
          <span className="text-sm text-ink-55">
            <bdi>
              {text.length} / {MAX_INPUT_CHARS}
            </bdi>
          </span>
        )}
      </div>

      {/* Only text mode asks how it arrived: a call answers that by itself,
          and a link does not have an answer worth guessing at. */}
      {mode === "text" && (
        <div className="mt-6">
          <SectionTitle>{t("detect.channel")}</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {CHANNELS.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setChannel(option)}
                className={`border px-2.5 py-1 text-sm ${
                  channel === option
                    ? "border-ink bg-ink text-paper"
                    : "border-ink-20 text-ink-70"
                }`}
              >
                {t(`channel.${option}` as TextKey)}
              </button>
            ))}
          </div>
        </div>
      )}

      {errorKey && (
        <p role="alert" className="mt-6 border-s-4 border-threat ps-3 text-base text-ink">
          {t(errorKey)}
        </p>
      )}

      <div className="mt-8">
        <PrimaryButton onClick={onCheck} disabled={busy || text.trim().length === 0}>
          {busy ? t("detect.loading") : t("detect.cta")}
        </PrimaryButton>
        <p className="mt-3 text-center text-sm text-ink-55">{t("report.privacy")}</p>
      </div>
    </Page>
  );
}

function VerdictScreen({
  result,
  text,
  onReport,
  onShield,
  onAgain,
}: {
  result: AnalyzeResponse;
  text: string;
  onReport: () => void;
  onShield: () => void;
  onAgain: () => void;
}) {
  const { t } = useI18n();

  return (
    <Page>
      <header className="flex justify-end">
        <LangToggle />
      </header>

      <div className="mt-4">
        <VerdictBand verdict={result.verdict} />
      </div>

      <p dir="auto" className="mt-5 text-2xl leading-snug">
        {result.headline}
      </p>

      <p className="mt-3 text-base text-ink-70">
        {t("verdict.confidence")}{" "}
        <bdi>{result.confidence}%</bdi>
        {result.cached && (
          <span className="ms-3 border border-ink-20 px-2 py-0.5 text-sm">
            {t("verdict.saved_tag")}
          </span>
        )}
      </p>

      <section className="mt-9">
        <SectionTitle>{t("verdict.message")}</SectionTitle>
        <HighlightedMessage text={text} flags={result.red_flags} />
      </section>

      {result.red_flags.length > 0 && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.why")}</SectionTitle>
          <ol className="space-y-3">
            {result.red_flags.map((flag, index) => (
              <li key={index} className="flex gap-3">
                <span className="pt-0.5 font-bold text-threat">
                  <bdi>{index + 1}</bdi>
                </span>
                <span dir="auto">{flag.why}</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {result.actions.length > 0 && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.actions")}</SectionTitle>
          <ul className="space-y-3">
            {result.actions.map((action, index) => (
              <li dir="auto" key={index} className="border-s-2 border-ink-20 ps-4">
                {action}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.route_to_shield && (
        <button
          type="button"
          onClick={onShield}
          className="mt-10 block w-full border-2 border-threat px-5 py-4 text-start"
        >
          <span className="block text-xl font-semibold text-threat">
            {t("shield.entry")}
          </span>
          <span className="mt-1 block text-base text-ink-70">
            {t("shield.entry_sub")}
          </span>
        </button>
      )}

      {result.report_recommended && (
        <div className="mt-6">
          <PrimaryButton threat onClick={onReport}>
            {t("report.cta")}
          </PrimaryButton>
        </div>
      )}

      <div className="mt-4">
        <QuietButton onClick={onAgain}>{t("verdict.again")}</QuietButton>
      </div>

      <p className="mt-8 text-sm text-ink-55">{t("verdict.powered")}</p>
    </Page>
  );
}

function ReportSheet({
  result,
  text,
  channel,
  onCancel,
  onDone,
}: {
  result: AnalyzeResponse;
  text: string;
  channel: Channel | undefined;
  onCancel: () => void;
  onDone: (caseNumber: string) => void;
}) {
  const { t } = useI18n();
  const [includeText, setIncludeText] = useState(true);
  const [sending, setSending] = useState(false);
  const [failed, setFailed] = useState(false);

  async function send() {
    setSending(true);
    setFailed(false);
    try {
      const response = await sendReport({
        source: "detect",
        category: result.category,
        verdict: result.verdict,
        confidence: result.confidence,
        impersonated_entity: result.impersonated_entity,
        channel,
        message_text: includeText ? text : undefined,
        is_test: isTestMode(),
      });
      rememberCase(response.case_number);
      onDone(response.case_number);
    } catch {
      setFailed(true);
      setSending(false);
    }
  }

  return (
    <Page>
      <h1 className="mt-6 text-3xl font-bold">{t("report.title")}</h1>
      <p className="mt-5 text-lg">{t("report.includes")}</p>

      <label className="mt-7 flex items-center gap-3 text-lg">
        <input
          type="checkbox"
          checked={includeText}
          onChange={(e) => setIncludeText(e.target.checked)}
          className="size-5 accent-black"
        />
        {t("report.include_text")}
      </label>

      <p className="mt-7 text-base text-ink-70">{t("report.privacy")}</p>

      {failed && (
        <p role="alert" className="mt-6 border-s-4 border-threat ps-3">
          {t("error.generic")}
        </p>
      )}

      <div className="mt-9">
        <PrimaryButton threat onClick={send} disabled={sending}>
          {sending ? t("report.sending") : t("report.send")}
        </PrimaryButton>
      </div>
      <div className="mt-4">
        <QuietButton onClick={onCancel}>{t("report.cancel")}</QuietButton>
      </div>
    </Page>
  );
}

function ReportDone({
  caseNumber,
  onClose,
}: {
  caseNumber: string;
  onClose: () => void;
}) {
  const { t } = useI18n();
  return (
    <Page>
      <p className="mt-16 text-2xl leading-snug">{t("report.done")}</p>

      <div className="mt-10 border-y-2 border-ink py-8 text-center">
        <span className="block text-sm uppercase tracking-widest text-ink-55">
          {t("report.case")}
        </span>
        <bdi className="mt-3 block text-4xl font-bold tracking-tight">{caseNumber}</bdi>
      </div>

      <p className="mt-5 text-lg">{t("report.keep")}</p>
      <p className="mt-2 text-lg">{t("report.status")}</p>
      <p className="mt-8 text-sm text-ink-55">{t("report.pilot")}</p>

      <div className="mt-10">
        <QuietButton onClick={onClose}>{t("report.close")}</QuietButton>
      </div>
    </Page>
  );
}
