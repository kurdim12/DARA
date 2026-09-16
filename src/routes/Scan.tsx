import { useEffect, useRef, useState } from "react";
import { Briefcase, Check, Globe, Link2, MessageSquare, Phone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  AnalysisType,
  AnalyzeImage,
  AnalyzeResponse,
  Category,
} from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { HighlightedMessage } from "../components/HighlightedMessage";
import { ScannerCard } from "../components/ScannerCard";
import { TypeChips, TYPE_META } from "../components/TypeChips";
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
import { LEVEL_FILL, LEVEL_LABEL, levelFor } from "../lib/level";
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
    if (!shot && trimmed.length < MIN_INPUT) return;
    setErrorKey(null);
    setStage({ name: "loading" });
    try {
      const result = await analyze(trimmed, lang, undefined, shot ?? undefined, forced ?? type);
      setStage({
        name: "result",
        result,
        // A screenshot has no pasted text behind it; what the engine could read
        // out of the image is the thing to quote back.
        input: trimmed || result.extracted_text || "",
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
        onAgain={() => {
          setText("");
          setImage(null);
          setStage({ name: "input" });
        }}
      />
    );
  }

  const busy = stage.name === "loading";
  const ready = image !== null || text.trim().length >= MIN_INPUT;

  return (
    <>
      <Page>
        <Header title={t("scan.title")} />

        <TypeChips value={type} onChange={setType} />

        <div className="mt-3">
          <ScannerCard
            variant="scan"
            text={text}
            onText={setText}
            disabled={busy}
            placeholder={t(TYPE_META[type].placeholder)}
            label={t(TYPE_META[type].label)}
            image={image}
            onImage={(next) => {
              setImage(next);
              if (next) setErrorKey(null);
            }}
            onError={setErrorKey}
          />
        </div>

        {errorKey && (
          <p
            role="alert"
            className="mt-3 rounded-btn bg-red-soft p-3 text-[14px] font-medium text-red-ink"
          >
            {t(errorKey)}
          </p>
        )}

        <div className="mt-3">
          <PrimaryButton disabled={!ready} loading={busy} onClick={() => void run(text)}>
            {busy ? t("scan.analyzing") : t("home.analyze")}
          </PrimaryButton>
        </div>

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
}: {
  result: AnalyzeResponse;
  input: string;
  navigate: (route: Route) => void;
  onAgain: () => void;
  onReport: (prefill: { category: Category; messageText: string }) => void;
}) {
  const { t } = useI18n();
  const level = levelFor(result);
  const fill = LEVEL_FILL[level];

  return (
    <>
      <Page>
        <Header title={t("scan.title")} />

        {/* The one memorable moment: the verdict, in one colour, edge to edge,
            with the red flags underlined inside the message the person
            actually received. Everything below it is quiet on purpose. */}
        <Bleed>
          <div className={`reveal relative px-5 py-7 ${fill.bg} ${fill.text}`}>
            {result.cached && (
              <span className="absolute end-4 top-4 rounded-full bg-white/25 px-2.5 py-1 text-[12px] font-bold">
                {t("result.saved")}
              </span>
            )}
            <p className="text-[34px] font-extrabold leading-[1.05] tracking-[-1px]">
              {t(LEVEL_LABEL[level])}
            </p>
            <p dir="auto" className="mt-2.5 text-[15px] font-medium leading-[1.45]">
              {result.headline}
            </p>
          </div>
        </Bleed>

        <p className="t-eyebrow mt-6">{t("result.input")}</p>
        <div className="mt-2.5">
          <HighlightedMessage text={input} flags={result.red_flags} />
        </div>

        {result.red_flags.length > 0 && (
          <>
            <p className="t-eyebrow mt-7">{t("result.why")}</p>
            {/* Numbered to match the superscripts in the message above. That
                pairing is the explanation — the same warning icon three times
                over says nothing about which mark it belongs to. */}
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

        {result.actions.length > 0 && (
          <>
            <p className="t-eyebrow mt-7">{t("result.what_now")}</p>
            <ul className="mt-3 space-y-3.5">
              {result.actions.map((action, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check
                    size={18}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className="mt-0.5 shrink-0 text-ink"
                  />
                  <span dir="auto" className="t-body flex-1">
                    {action}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="mt-8 space-y-2.5">
          <PrimaryButton
            onClick={() => onReport({ category: result.category, messageText: input })}
          >
            {t("result.report_cta")}
          </PrimaryButton>
          <OutlineButton onClick={onAgain}>{t("result.scan_another")}</OutlineButton>
        </div>

        <p className="mt-5 text-center text-[12px] font-semibold text-ink-2">
          {t("result.powered")}
        </p>
      </Page>
      <BottomNav active="scan" navigate={navigate} />
    </>
  );
}
