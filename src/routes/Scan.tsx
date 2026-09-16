import { useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Briefcase,
  Check,
  Globe,
  Link2,
  MessageSquare,
  Phone,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AnalysisType,
  AnalyzeImage,
  AnalyzeResponse,
  Category,
} from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { HighlightedMessage } from "../components/HighlightedMessage";
import { ScanInputCard } from "../components/ScanInputCard";
import { JordanLayerRows } from "../components/JordanLayer";
import {
  Bleed,
  Card,
  Header,
  OutlineButton,
  Page,
  PrimaryButton,
  SectionLabel,
} from "../components/Shell";
import { analyze, AppError } from "../lib/api";
import { LEVEL_FILL, LEVEL_LABEL, VERDICT_WORD, levelFor } from "../lib/level";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

/** Eight characters is short enough for a phone number, long enough to mean something. */
const MIN_INPUT = 8;

const WHAT: { key: TextKey; Icon: LucideIcon }[] = [
  { key: "scan.what_1", Icon: MessageSquare },
  { key: "scan.what_2", Icon: Link2 },
  { key: "scan.what_3", Icon: Phone },
  { key: "scan.what_4", Icon: Briefcase },
  { key: "scan.what_5", Icon: Globe },
];

export interface Seed {
  text: string;
  run: boolean;
  type?: AnalysisType;
  image?: AnalyzeImage | null;
}

type Stage =
  | { name: "input" }
  | { name: "loading" }
  | { name: "result"; result: AnalyzeResponse; input: string };

export function Scan({
  navigate,
  seed,
  onSeedUsed,
  onReport,
}: {
  navigate: (route: Route) => void;
  /** Text or a screenshot carried over from Home or Protect, and whether to run it. */
  seed: Seed | null;
  onSeedUsed: () => void;
  /** Opens Report with the verdict's own category already chosen. */
  onReport: (prefill: { category: Category; messageText: string }) => void;
}) {
  const { t, lang } = useI18n();
  const [type, setType] = useState<AnalysisType>("message");
  const [text, setText] = useState("");
  const [image, setImage] = useState<AnalyzeImage | null>(null);
  const [stage, setStage] = useState<Stage>({ name: "input" });
  const [errorKey, setErrorKey] = useState<TextKey | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (!seed || ran.current) return;
    ran.current = true;
    setText(seed.text);
    if (seed.type) setType(seed.type);
    if (seed.image) setImage(seed.image);
    onSeedUsed();
    if (seed.run) void run(seed.text, seed.type, seed.image ?? null);
    // run() is stable for this purpose; re-running on every render would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  async function run(value: string, forced?: AnalysisType, picture?: AnalyzeImage | null) {
    const trimmed = value.trim();
    const shot = picture === undefined ? image : picture;
    if (!shot && trimmed.length < MIN_INPUT) {
      // The button lights up on any content, so this path is reachable now.
      // Silently returning would read as a dead button.
      setErrorKey("scan.too_short");
      return;
    }
    setErrorKey(null);
    setStage({ name: "loading" });
    try {
      const result = await analyze(trimmed, lang, undefined, shot ?? undefined, forced ?? type);
      setStage({
        name: "result",
        result,
        // A screenshot has no pasted text behind it. What the OCR step read is
        // both what the engine judged and what the flags point into, so it is
        // the thing to show.
        input: result.extracted_text || trimmed,
      });
    } catch (error) {
      setErrorKey(error instanceof AppError ? error.key : "error.generic");
      setStage({ name: "input" });
    }
  }

  if (stage.name === "result") {
    return (
      <Result
        result={stage.result}
        input={stage.input}
        navigate={navigate}
        onReport={onReport}
        /* A corrected transcription re-enters as ordinary text — no image, so
           the OCR step is not repeated and not paid for twice. */
        onRescan={(corrected) => {
          setImage(null);
          setText(corrected);
          void run(corrected, undefined, null);
        }}
        onAgain={() => {
          setText("");
          setImage(null);
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

        {/* The same component Home uses. The chips, the label, the consent
            line and the one button all live inside it, so the two screens
            cannot drift into two different ideas of how you check something. */}
        <ScanInputCard
          text={text}
          onText={setText}
          type={type}
          onType={setType}
          busy={busy}
          image={image}
          onImage={(next) => {
            setImage(next);
            if (next) setErrorKey(null);
          }}
          onError={setErrorKey}
          onSubmit={() => void run(text)}
          submitLabel={busy ? t("scan.analyzing") : t("home.analyze")}
        />

        {errorKey && (
          <p
            role="alert"
            className="mt-3 rounded-btn bg-red-soft p-3 text-[14px] font-medium text-red-ink"
          >
            {t(errorKey)}
          </p>
        )}

        <Card className="mt-7">
          <SectionLabel>{t("scan.what")}</SectionLabel>
          <ul className="mt-2">
            {WHAT.map(({ key, Icon }) => (
              <li key={key} className="flex items-center gap-3 py-2">
                <Icon size={20} strokeWidth={1.75} className="shrink-0 text-ink" aria-hidden="true" />
                <span className="t-body">{t(key)}</span>
              </li>
            ))}
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
  onReport,
  onRescan,
}: {
  result: AnalyzeResponse;
  input: string;
  navigate: (route: Route) => void;
  onAgain: () => void;
  onReport: (prefill: { category: Category; messageText: string }) => void;
  /** Re-runs the ordinary text pipeline on a corrected transcription. */
  onRescan: (text: string) => void;
}) {
  const { t, lang } = useI18n();
  // Seeded from the transcription, and reset whenever a new one arrives.
  const [draft, setDraft] = useState(input);
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    setDraft(input);
    setEditing(false);
  }, [input]);
  const level = levelFor(result);
  const fill = LEVEL_FILL[level];
  const facts: { key: TextKey; value: string }[] = [];
  if (result.impersonated_entity)
    facts.push({ key: "verdict.impersonated", value: result.impersonated_entity });
  if (result.category !== "none")
    facts.push({ key: "verdict.threat_type", value: t(`category.${result.category}` as TextKey) });
  if (result.requested_action)
    facts.push({ key: "verdict.requested", value: result.requested_action });
  if (result.attack_goal !== "none")
    facts.push({ key: "verdict.goal", value: t(`goal.${result.attack_goal}` as TextKey) });
  if (result.pressure_methods.length > 0)
    facts.push({
      key: "verdict.pressure",
      value: result.pressure_methods.map((m) => t(`pressure.${m}` as TextKey)).join(" · "),
    });

  return (
    <>
      <Page>
        <Header title={t("res.title")} />

        {/* The verdict leads with the word — احتيال, مشبوه, تبدو سليمة — and the
            finer level sits under it. The mark is behind the word at 8%: the
            brand signing the judgement, quiet enough that nothing has to be
            read through it. */}
        <Bleed>
          <div className={`reveal relative overflow-hidden px-5 py-7 ${fill.bg} ${fill.text}`}>
            <img
              src="/brand/dara-mark-white.png"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-6 -end-4 w-[150px] select-none opacity-[0.08]"
            />
            {result.cached && (
              <span className="absolute end-4 top-4 rounded-full bg-white/25 px-2.5 py-1 text-[12px] font-bold">
                {t("res.saved")}
              </span>
            )}
            <div className="relative">
              <p className="t-verdict">{t(VERDICT_WORD[level])}</p>
              {/* Full contrast, not 80%: over --red that line measures 3.94:1
                  at 12px, over --amber 3.93 and over --green 4.35. Size and
                  weight already carry the hierarchy under a 34px verdict. */}
              <p className="t-meta mt-1.5">
                {t("res.risk_level")}: {t(LEVEL_LABEL[level])}
              </p>
              <p dir="auto" className="mt-3 text-[15px] font-medium leading-[1.45]">
                {result.headline}
              </p>
            </div>
          </div>
        </Bleed>

        {/* 2. The message, with every flag underlined where it sits. The one
               thing on this screen a jury follows with their eyes.

               For a screenshot this IS the transcription — the engine judged
               this exact text, so every quote it returned exists inside it,
               which is why the underlines land. Showing it once and letting
               it be edited in place beats printing the same paragraph twice. */}
        <div className="mt-6 flex items-center justify-between gap-3">
          <p className="t-eyebrow">
            {result.input_kind === "image" ? t("ocr.title") : t("res.message")}
          </p>
          {result.input_kind === "image" && (
            <button
              type="button"
              onClick={() => {
                setDraft(input);
                setEditing((was) => !was);
              }}
              className="tap text-[13px] font-bold text-ink-2 underline underline-offset-2"
            >
              {t(editing ? "ocr.cancel" : "ocr.correct")}
            </button>
          )}
        </div>

        {editing && result.input_kind === "image" ? (
          <div className="mt-2.5">
            <textarea
              dir="auto"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={5}
              aria-label={t("ocr.title")}
              className="w-full resize-none rounded-btn border border-line bg-card p-3.5 text-[15px] leading-relaxed text-ink outline-none"
            />
            <p className="t-sub mt-2">{t("ocr.note")}</p>
            <button
              type="button"
              disabled={draft.trim().length === 0 || draft.trim() === input.trim()}
              onClick={() => onRescan(draft.trim())}
              className="press tap mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-btn border border-line bg-paper text-[14px] font-bold text-ink disabled:text-ink-2"
            >
              <RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />
              {t("ocr.rescan")}
            </button>
          </div>
        ) : (
          <div className="mt-2.5">
            <HighlightedMessage text={input} flags={result.red_flags} />
          </div>
        )}

        {result.red_flags.length > 0 && (
          <>
            <p className="t-eyebrow mt-7">{t("res.why")}</p>
            {/* Numbered to match the superscripts in the message above. */}
            <ol className="mt-3 space-y-3.5">
              {result.red_flags.map((flag, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="mt-px flex size-[22px] shrink-0 items-center justify-center rounded-full bg-red-soft text-[12px] font-extrabold text-red-ink">
                    <bdi className="tnum">{index + 1}</bdi>
                  </span>
                  <span dir="auto" className="t-body flex-1">
                    {flag.why}
                  </span>
                </li>
              ))}
            </ol>
          </>
        )}

        {/* 3. The Jordan layer: facts, each one confirmed, flagged, or openly
               not checked. */}
        {result.jordan_layer && (
          <>
            <p className="t-eyebrow mt-7">{t("jl.title")}</p>
            <Card className="mt-2.5">
              <bdi dir="ltr" className="block break-all text-[13px] font-semibold text-ink-2">
                {result.jordan_layer.subject}
              </bdi>
              <div className="mt-2.5">
                <JordanLayerRows layer={result.jordan_layer.layer} />
              </div>
            </Card>
          </>
        )}

        {/* 4. What the server pulled apart, one card per kind of thing. */}
        {result.url_analysis && (
          <>
            <p className="t-eyebrow mt-7">{t("verdict.link")}</p>
            <Card className="mt-2.5">
              {/* Text, never an anchor. Tapping it is the exact thing this
                  screen exists to stop. */}
              <bdi
                dir="ltr"
                className="block break-all text-[13px] font-semibold leading-relaxed text-ink"
              >
                {result.url_analysis.url}
              </bdi>
              <p className="t-sub mt-1 text-[12px]">
                <bdi dir="ltr">{result.url_analysis.hostname}</bdi>
              </p>
              {result.url_analysis.signals.length > 0 && (
                <ul className="mt-3 space-y-2 border-t border-line pt-3">
                  {result.url_analysis.signals.map((signal) => (
                    <li key={signal} className="flex items-start gap-2.5">
                      <AlertTriangle
                        size={16}
                        strokeWidth={1.75}
                        aria-hidden="true"
                        className="mt-0.5 shrink-0 text-red-ink"
                      />
                      <span dir="auto" className="t-body flex-1 text-[14px]">
                        {t(`url.${signal}` as TextKey)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </>
        )}

        {result.known_threat_match && (
          <>
            <p className="t-eyebrow mt-7">{t("verdict.pattern")}</p>
            <Card className="mt-2.5">
              <p dir="auto" className="t-row">
                {lang === "ar"
                  ? result.known_threat_match.title_ar
                  : result.known_threat_match.title_en}
              </p>
              {result.known_threat_match.matched_signals.length > 0 && (
                <ul className="mt-2.5 flex flex-wrap gap-1.5">
                  {result.known_threat_match.matched_signals.map((signal) => (
                    <li
                      key={signal}
                      className="rounded-full bg-paper px-2.5 py-1 text-[12px] font-semibold text-ink-2"
                    >
                      <bdi>{signal}</bdi>
                    </li>
                  ))}
                </ul>
              )}
              {result.known_threat_match.source_name && (
                <p className="t-sub mt-2.5 border-t border-line pt-2 text-[12px]">
                  <bdi>{result.known_threat_match.source_name}</bdi>
                </p>
              )}
            </Card>
          </>
        )}

        {result.evidence_items && result.evidence_items.length > 0 && (
          <>
            <p className="t-eyebrow mt-7">{t("verdict.seen_in_image")}</p>
            <Card className="mt-2.5">
              <dl className="divide-y divide-line">
                {result.evidence_items.map((item, index) => (
                  <div key={index} className="py-2.5 first:pt-0 last:pb-0">
                    <dt className="t-meta text-ink-2">{t(`evidence.${item.type}` as TextKey)}</dt>
                    <dd dir="auto" className="t-body mt-0.5 text-[14px]">
                      <bdi className="font-semibold">{item.value}</bdi>
                      {item.why && <span className="text-ink-2"> — {item.why}</span>}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </>
        )}

        {facts.length > 0 && (
          <>
            <p className="t-eyebrow mt-7">{t("verdict.whats_happening")}</p>
            <Card className="mt-2.5">
              <dl className="divide-y divide-line">
                {facts.map((row) => (
                  <div key={row.key} className="flex flex-wrap gap-x-3 gap-y-0.5 py-2 first:pt-0 last:pb-0">
                    <dt className="t-meta min-w-[104px] text-ink-2">{t(row.key)}</dt>
                    <dd dir="auto" className="t-body min-w-0 flex-1 text-[14px]">
                      {row.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          </>
        )}

        {/* 5. What to do, then the three things you can do about it. */}
        {result.actions.length > 0 && (
          <>
            <p className="t-eyebrow mt-7">{t("res.what_now")}</p>
            <ul className="mt-3 space-y-3.5">
              {result.actions.map((action, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check size={18} strokeWidth={1.75} aria-hidden="true" className="mt-0.5 shrink-0 text-ink" />
                  <span dir="auto" className="t-body flex-1">
                    {action}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Both actions are always here; which one is the red one follows the
            verdict. A "looks safe" result asking you to report it in red says
            danger where the screen has just said there is none. */}
        <div className="mt-8 space-y-2.5">
          {result.report_recommended ? (
            <>
              <PrimaryButton onClick={() => onReport({ category: result.category, messageText: input })}>
                {t("res.report_cta")}
              </PrimaryButton>
              <OutlineButton onClick={onAgain}>{t("res.again")}</OutlineButton>
            </>
          ) : (
            <>
              <PrimaryButton onClick={onAgain}>{t("res.again")}</PrimaryButton>
              <OutlineButton
                onClick={() => onReport({ category: result.category, messageText: input })}
              >
                {t("res.report_cta")}
              </OutlineButton>
            </>
          )}
          {result.route_to_shield && (
            <button
              type="button"
              onClick={() => navigate("shield")}
              className="press flex h-12 w-full items-center justify-center gap-2 rounded-btn border border-red text-[15px] font-bold text-red-ink"
            >
              <ShieldAlert size={18} strokeWidth={1.75} aria-hidden="true" />
              {t("res.shield_tile_sub")}
            </button>
          )}
        </div>

        <p className="t-meta mt-5 text-center text-ink-2">
          {t("verdict.powered")}
          {result.latency_ms > 0 && (
            <>
              {" · "}
              <bdi className="tnum">
                {t("res.footer").replace("{s}", (result.latency_ms / 1000).toFixed(1))}
              </bdi>
            </>
          )}
        </p>
      </Page>
      <BottomNav active="scan" navigate={navigate} />
    </>
  );
}
