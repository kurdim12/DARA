import { useId, useRef, useState } from "react";
import { AlertTriangle, ClipboardPaste, ImageUp, RefreshCw, X } from "lucide-react";
import { ALLOWED_IMAGE_TYPES, MAX_INPUT_CHARS, type AnalysisType, type AnalyzeImage } from "../../shared/types";
import { AppError } from "../lib/api";
import { readClipboardText } from "../lib/clipboard";
import { detectType } from "../lib/detect";
import { prepareImage, previewUrl } from "../lib/image";
import { ScanProgress } from "./ScanProgress";
import { TypeChips } from "./TypeChips";
import { PrimaryButton } from "./Shell";
import { useI18n, type TextKey } from "../i18n";

/**
 * The one input on Home and on فحص. One component, so the two screens cannot
 * drift into two different ideas of how you check something.
 *
 * The path is enter → review → scan, in that order and only that order:
 *
 * - Paste fills the FIELD. It never scans. Home used to read the clipboard and
 *   submit it in one press, which meant the only way to see what was about to
 *   be sent was to watch it go.
 * - The consent sentence sits under the button it is about, and it is
 *   literally true — `paste()` runs from the tap handler and from nowhere
 *   else. Nothing here touches the clipboard on mount.
 * - «افحص الآن» is the only scan trigger on the page.
 */
export function ScanInputCard({
  text,
  onText,
  type,
  onType,
  image,
  onImage,
  onError,
  onSubmit,
  busy = false,
  submitLabel,
  failure = null,
}: {
  text: string;
  onText: (value: string) => void;
  type: AnalysisType;
  onType: (type: AnalysisType) => void;
  image: AnalyzeImage | null;
  onImage: (image: AnalyzeImage | null) => void;
  onError: (key: TextKey) => void;
  onSubmit: () => void;
  busy?: boolean;
  /** Scan says "analysing" mid-flight; Home never sees that state. */
  submitLabel?: string;
  /** The last failure, shown inside the card with a retry that resubmits. */
  failure?: TextKey | null;
}) {
  const { t } = useI18n();
  const fieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);
  const chosen = useRef(false);
  const ready = text.trim().length > 0 || image !== null;

  /**
   * Set the chip from what the text looks like, but only ever as a suggestion.
   *
   * Two things keep it from being annoying. A guess of null — prose, which is
   * most messages — leaves the chip alone rather than resetting it. And once
   * someone has picked a chip themselves, detection stops touching it: «رابط»
   * and «موقع» are genuinely a judgement call, and an app that keeps undoing
   * that judgement is worse than one that never guessed.
   */
  function fill(value: string) {
    const next = value.slice(0, MAX_INPUT_CHARS);
    onText(next);
    if (chosen.current) return;
    const guess = detectType(next);
    if (guess) onType(guess);
  }

  /** Someone tapped a chip. Their choice outranks the guess from here on. */
  function chooseType(next: AnalysisType) {
    chosen.current = true;
    onType(next);
  }

  async function paste() {
    try {
      const clip = await readClipboardText();
      // The text lands in the field for review. This does not scan.
      if (clip) fill(clip);
      else onError("ft.clip.empty");
    } catch {
      // Refused, or never answered. Say so; typing still works.
      onError("ft.clip.failed");
    }
  }

  async function pick(file: File | undefined) {
    if (!file) return;
    setReading(true);
    try {
      onImage(await prepareImage(file));
    } catch (error) {
      onImage(null);
      onError(error instanceof AppError ? error.key : "error.bad_image");
    } finally {
      setReading(false);
    }
  }

  return (
    <div className="rounded-scanner border border-line bg-card p-4">
      <TypeChips value={type} onChange={chooseType} />

      <label htmlFor={fieldId} className="mt-3.5 block text-[15px] font-bold text-ink">
        {t("scan.input_label")}
      </label>

      <textarea
        id={fieldId}
        dir={text.length > 0 ? "auto" : undefined}
        value={text}
        disabled={busy}
        maxLength={MAX_INPUT_CHARS}
        onChange={(e) => fill(e.target.value)}
        placeholder={t("scan.input_ph")}
        rows={3}
        className="mt-2 w-full resize-none rounded-btn border border-line bg-paper p-3.5 text-[15px] font-medium leading-relaxed text-ink outline-none placeholder:text-ink-2"
        style={{ minHeight: 96 }}
      />

      {image && (
        <div className="mt-3 flex items-center gap-3 rounded-btn bg-paper p-2.5">
          <img
            src={previewUrl(image)}
            alt=""
            className="size-12 shrink-0 rounded-[10px] border border-line object-cover"
          />
          <span className="t-sub flex-1">{t("detect.image")}</span>
          <button
            type="button"
            onClick={() => onImage(null)}
            aria-label={t("detect.image_remove")}
            className="tap flex size-8 items-center justify-center rounded-full text-ink-2"
          >
            <X size={18} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Actions on the start side, the counter on the end. Wraps rather than
          squeezing, because «إرفاق لقطة شاشة» is a long label. */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <OutlinePill Icon={ClipboardPaste} label={t("scan.paste")} onClick={() => void paste()} />
          <OutlinePill
            Icon={ImageUp}
            label={reading ? t("detect.loading_image") : t("scan.attach")}
            onClick={() => fileRef.current?.click()}
          />
        </div>
        <span className="tnum shrink-0 text-[13px] font-semibold text-ink-2">
          <bdi>
            {text.length} / {MAX_INPUT_CHARS}
          </bdi>
        </span>
      </div>

      <p className="mt-2.5 text-[13px] font-normal leading-snug text-ink-2">
        {t("scan.consent")}
      </p>

      {/* The failure sits inside the card, where the eye already is, and
          carries the way out with it. A thin strip under the button is
          where a person who just waited nine seconds does not look. */}
      {failure && !busy && (
        <div role="alert" className="mt-4 rounded-btn bg-red-soft p-3.5">
          <p className="flex items-center gap-2 text-[15px] font-bold text-red-ink">
            <AlertTriangle size={17} strokeWidth={2} aria-hidden="true" />
            {t("error.title")}
          </p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-red-ink">{t(failure)}</p>
          <button
            type="button"
            onClick={onSubmit}
            className="press tap mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-btn bg-red text-[15px] font-bold text-white-brush"
          >
            <RefreshCw size={17} strokeWidth={2} aria-hidden="true" />
            {t("scan.retry")}
          </button>
        </div>
      )}

      {busy && <ScanProgress />}

      <div className="mt-4">
        <PrimaryButton disabled={!ready} loading={busy} onClick={onSubmit}>
          {submitLabel ?? t("home.analyze")}
        </PrimaryButton>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        aria-label={t("scan.attach")}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          // Let the same file be chosen twice in a row.
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** 36px tall, 44px of tappable area via `.tap`. */
function OutlinePill({
  Icon,
  label,
  onClick,
}: {
  Icon: typeof ClipboardPaste;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="press tap flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3.5 text-[13px] font-bold text-ink-2"
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
      {label}
    </button>
  );
}
