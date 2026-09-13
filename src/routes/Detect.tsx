import { useEffect, useRef, useState } from "react";
import {
  ALLOWED_IMAGE_TYPES,
  CHANNELS,
  MAX_INPUT_CHARS,
  type AnalyzeImage,
  type AnalyzeResponse,
  type Channel,
} from "../../shared/types";
import { analyze, AppError, sendReport } from "../lib/api";
import { prepareImage, previewUrl } from "../lib/image";
import { isTestMode, rememberCase } from "../lib/storage";
import { BottomNav } from "../components/BottomNav";
import { CaseNumber } from "../components/CaseNumber";
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
  const [channel, setChannel] = useState<Channel>("sms");
  const [stage, setStage] = useState<Stage>({ name: "input" });
  const [errorKey, setErrorKey] = useState<TextKey | null>(null);
  // Held in React state for this one check. Never written to storage.
  const [image, setImage] = useState<AnalyzeImage | null>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // A message picked from the demo tray lands in the box, unsent.
  useEffect(() => {
    if (seedText === null) return;
    setText(seedText);
    setStage({ name: "input" });
    setErrorKey(null);
    onSeedUsed();
  }, [seedText, onSeedUsed]);

  async function onPaste() {
    setErrorKey(null);
    try {
      const clip = await navigator.clipboard.readText();
      if (clip) setText(clip.slice(0, MAX_INPUT_CHARS));
      else boxRef.current?.focus();
    } catch {
      // Clipboard read is blocked on plenty of phones; say so and move on.
      setErrorKey("detect.paste_failed");
      boxRef.current?.focus();
    }
  }

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setErrorKey(null);
    try {
      setImage(await prepareImage(file));
    } catch (error) {
      setImage(null);
      setErrorKey(error instanceof AppError ? error.key : "error.bad_image");
    }
  }

  async function onCheck() {
    const trimmed = text.trim();
    if (!trimmed && !image) return;
    if (trimmed.length > MAX_INPUT_CHARS) {
      setErrorKey("error.too_long");
      return;
    }
    setErrorKey(null);
    setStage({ name: "loading" });
    try {
      const result = await analyze(trimmed, lang, channel, image ?? undefined);
      setStage({ name: "verdict", result });
    } catch (error) {
      setErrorKey(error instanceof AppError ? error.key : "error.generic");
      setStage({ name: "input" });
    }
  }

  function reset() {
    setText("");
    setImage(null);
    setErrorKey(null);
    setStage({ name: "input" });
  }

  if (stage.name === "verdict") {
    return (
      <VerdictScreen
        result={stage.result}
        text={text.trim()}
        image={image}
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
        channel={channel}
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
    <>
      <Page withNav>
      <header className="flex items-center justify-between">
        <button type="button" onClick={() => navigate("home")} className="tap text-ink-70">
          {t("shield.back")}
        </button>
        <LangToggle />
      </header>

      <h1 className="mt-6 text-3xl font-bold">{t("detect.title")}</h1>
      <p className="mt-2 text-base text-ink-70">{t("detect.subtitle")}</p>

      {/* One input for everything. A link is text, a number is text, and what
          a caller said is text — so the person is never asked to file it
          first. The engine works out what it is looking at. */}
      <textarea
        ref={boxRef}
        // Pasted text sets its own direction. An empty box has none to read, so
        // it follows the interface instead — otherwise the Arabic placeholder
        // is laid out as an LTR line and its full stop lands on the wrong end.
        dir={text.length > 0 ? "auto" : undefined}
        value={text}
        disabled={busy}
        maxLength={MAX_INPUT_CHARS}
        onChange={(e) => setText(e.target.value)}
        placeholder={t("detect.placeholder")}
        className="mt-7 h-[248px] w-full resize-none border-[1.5px] border-ink bg-paper p-4 text-lg leading-relaxed placeholder:text-ink-55"
      />

      <div className="mt-2.5 flex items-center justify-between text-sm">
        <div className="flex gap-6">
          <button type="button" onClick={onPaste} className="tap border-b border-ink pb-0.5">
            {t("detect.paste")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="tap border-b border-ink pb-0.5"
          >
            {t("detect.image")}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={ALLOWED_IMAGE_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              void onPickImage(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        <span className="text-ink-55">
          <bdi>
            {text.length} / {MAX_INPUT_CHARS}
          </bdi>
        </span>
      </div>

      {image && (
        <div className="mt-4 flex items-center gap-3">
          <img
            src={previewUrl(image)}
            alt=""
            className="h-16 w-16 border border-ink-20 object-cover"
          />
          <button
            type="button"
            onClick={() => setImage(null)}
            className="tap border-b border-ink pb-0.5 text-sm"
          >
            {t("detect.image_remove")}
          </button>
        </div>
      )}

      {/* Useful to the engine, not a decision the person has to make: it is
          already answered, and it stays quiet enough to skip. */}
      <div className="mt-7">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-55">
          {t("detect.channel")}
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {CHANNELS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setChannel(option)}
              className={`inline-flex min-h-11 items-center border px-3 text-sm ${
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

      {errorKey && (
        <p role="alert" className="mt-5 border-s-4 border-threat ps-3 text-base text-ink">
          {t(errorKey)}
        </p>
      )}

      <div className="mt-7">
        <PrimaryButton
          onClick={onCheck}
          disabled={busy || (text.trim().length === 0 && !image)}
        >
          {busy
            ? t(image ? "detect.loading_image" : "detect.loading")
            : t("detect.cta")}
        </PrimaryButton>
        <p className="mt-3 text-center text-sm text-ink-55">{t("report.privacy")}</p>
      </div>
      </Page>
      <BottomNav active="detect" navigate={navigate} />
    </>
  );
}

/** One label and one value. Renders nothing when there is no value. */
function Fact({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="py-2.5">
      <dt className="text-xs font-semibold uppercase tracking-widest text-ink-55">
        {label}
      </dt>
      <dd dir="auto" className="mt-1 text-base leading-snug">
        {value}
      </dd>
    </div>
  );
}

function VerdictScreen({
  result,
  text,
  image,
  onReport,
  onShield,
  onAgain,
}: {
  result: AnalyzeResponse;
  text: string;
  image: AnalyzeImage | null;
  onReport: () => void;
  onShield: () => void;
  onAgain: () => void;
}) {
  const { t, lang } = useI18n();

  // A saved verdict recorded before this phase has none of these fields, and
  // one of those is what airplane mode serves. Missing means absent, not a crash.
  const category =
    !result.category || result.category === "none"
      ? null
      : t(`category.${result.category}` as TextKey);
  const goal =
    !result.attack_goal || result.attack_goal === "none" || result.attack_goal === "unknown"
      ? null
      : t(`goal.${result.attack_goal}` as TextKey);
  const pressure = (result.pressure_methods ?? [])
    .map((m) => t(`pressure.${m}` as TextKey))
    .join(" · ");
  const hasBreakdown = Boolean(
    category || result.impersonated_entity || result.requested_action || goal || pressure,
  );

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

      {hasBreakdown && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.whats_happening")}</SectionTitle>
          <dl className="divide-y divide-ink-12 border-y border-ink-12">
            <Fact label={t("verdict.threat_type")} value={category} />
            <Fact
              label={t("verdict.impersonated")}
              value={result.impersonated_entity}
            />
            <Fact label={t("verdict.requested")} value={result.requested_action} />
            <Fact label={t("verdict.goal")} value={goal} />
            <Fact label={t("verdict.pressure")} value={pressure || null} />
          </dl>
        </section>
      )}

      {result.url_analysis && result.url_analysis.signals.length > 0 && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.link")}</SectionTitle>
          {/* The hostname only. Never a clickable link to the thing we are
              warning about. */}
          <p className="break-all text-base">
            <bdi>{result.url_analysis.hostname}</bdi>
          </p>
          <ul className="mt-3 space-y-2">
            {result.url_analysis.signals.map((code) => (
              <li key={code} className="border-s-2 border-ink-20 ps-4 text-base">
                {t(`url.${code}` as TextKey)}
              </li>
            ))}
          </ul>
        </section>
      )}

      {result.known_threat_match && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.pattern")}</SectionTitle>
          <p dir="auto" className="text-base leading-snug">
            {lang === "en"
              ? result.known_threat_match.title_en
              : result.known_threat_match.title_ar}
          </p>
        </section>
      )}

      {image && result.extracted_text && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.read_from_image")}</SectionTitle>
          <p
            dir="auto"
            className="whitespace-pre-wrap break-words border-s-2 border-ink-20 ps-4"
          >
            {result.extracted_text}
          </p>
        </section>
      )}

      {image && result.evidence_items && result.evidence_items.length > 0 && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.seen_in_image")}</SectionTitle>
          <ul className="divide-y divide-ink-12 border-y border-ink-12">
            {result.evidence_items.map((item, index) => (
              <li key={index} className="py-3">
                <span className="text-xs font-semibold uppercase tracking-widest text-ink-55">
                  {t(`evidence.${item.type}` as TextKey)}
                </span>
                <p dir="auto" className="mt-1 text-base leading-snug">
                  {item.value}
                </p>
                <p dir="auto" className="mt-1 text-base text-ink-70">
                  {item.why}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {text && (
        <section className="mt-9">
          <SectionTitle>{t("verdict.message")}</SectionTitle>
          <HighlightedMessage text={text} flags={result.red_flags} />
        </section>
      )}

      {text && result.red_flags.length > 0 && (
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
  channel: Channel;
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
      rememberCase(response.case_number, response.status);
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

      <CaseNumber value={caseNumber} />

      <p className="mt-5 text-lg">{t("report.keep")}</p>
      <p className="mt-2 text-lg">{t("report.status")}</p>
      <p className="mt-8 text-sm text-ink-55">{t("report.pilot")}</p>

      <div className="mt-10">
        <QuietButton onClick={onClose}>{t("report.close")}</QuietButton>
      </div>
    </Page>
  );
}
