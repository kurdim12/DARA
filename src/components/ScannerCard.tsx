import { useRef, useState, type ReactNode } from "react";
import { ClipboardPaste, ImageUp, X } from "lucide-react";
import { ALLOWED_IMAGE_TYPES, MAX_INPUT_CHARS, type AnalyzeImage } from "../../shared/types";
import { AppError } from "../lib/api";
import { readClipboardText } from "../lib/clipboard";
import { prepareImage, previewUrl } from "../lib/image";
import { useI18n, type TextKey } from "../i18n";

/**
 * The one place anything is pasted into. Home and Scan use the same component;
 * Home carries the chips and the button inside it, Scan keeps its chips above
 * and its button below, and that is the whole difference.
 *
 * The screenshot picker lives here, which is what gives image analysis — built
 * and reachable by the API since v2 — a way back onto the screen.
 */
export function ScannerCard({
  variant,
  text,
  onText,
  placeholder,
  disabled = false,
  image,
  onImage,
  onError,
  label,
  chips,
  submit,
}: {
  variant: "home" | "scan";
  text: string;
  onText: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  image: AnalyzeImage | null;
  onImage: (image: AnalyzeImage | null) => void;
  onError: (key: TextKey) => void;
  /** The accessible name for the field. The placeholder leaves when you type. */
  label: string;
  /** Home puts the type chips inside the card. */
  chips?: ReactNode;
  /** Home puts "Analyze now" inside the card too. */
  submit?: ReactNode;
}) {
  const { t } = useI18n();
  const fileRef = useRef<HTMLInputElement>(null);
  const [reading, setReading] = useState(false);

  async function paste() {
    try {
      const clip = await readClipboardText();
      if (clip) onText(clip.slice(0, MAX_INPUT_CHARS));
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

  const screenshot = (
    <>
      <input
        ref={fileRef}
        type="file"
        accept={ALLOWED_IMAGE_TYPES.join(",")}
        aria-label={t("scan.screenshot")}
        tabIndex={-1}
        className="sr-only"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          // Let the same file be chosen twice in a row.
          e.target.value = "";
        }}
      />
    </>
  );

  return (
    <div className="rounded-scanner border border-line bg-card p-4">
      <textarea
        dir={text.length > 0 ? "auto" : undefined}
        value={text}
        disabled={disabled}
        maxLength={MAX_INPUT_CHARS}
        onChange={(e) => onText(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        rows={variant === "home" ? 3 : 4}
        className="w-full resize-none rounded-btn border border-line bg-paper p-3.5 text-[15px] font-medium leading-relaxed text-ink outline-none placeholder:text-ink-2"
        style={{ minHeight: variant === "home" ? 84 : 118 }}
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

      {chips && <div className="mt-3">{chips}</div>}

      {variant === "scan" ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-2">
          <div className="flex min-w-0 items-center gap-2">
            <OutlinePill Icon={ClipboardPaste} label={t("scan.paste")} onClick={() => void paste()} />
            <OutlinePill
              Icon={ImageUp}
              label={reading ? t("detect.loading_image") : t("scan.screenshot")}
              onClick={() => fileRef.current?.click()}
            />
          </div>
          <span className="tnum shrink-0 text-[12px] font-semibold text-ink-2">
            <bdi>
              {text.length} / {MAX_INPUT_CHARS}
            </bdi>
          </span>
        </div>
      ) : null}

      {submit && <div className="mt-3.5">{submit}</div>}

      {variant === "home" ? (
        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[12.5px] font-semibold text-ink-2">
          <button type="button" onClick={() => void paste()} className="tap flex items-center gap-1.5">
            <ClipboardPaste size={14} strokeWidth={1.75} aria-hidden="true" />
            {t("home.paste_clipboard")}
          </button>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="tap flex items-center gap-1.5"
          >
            <ImageUp size={14} strokeWidth={1.75} aria-hidden="true" />
            {reading ? t("detect.loading_image") : t("scan.screenshot")}
          </button>
        </div>
      ) : null}

      {/* The reference build states this above its own paste card. It belongs
          next to the button it describes, and it is literally true: paste()
          runs on a press and nowhere else. */}
      <p className="mt-2.5 text-[12px] font-normal leading-snug text-ink-2">
        {t("ft.clip.line")}
      </p>

      {screenshot}
    </div>
  );
}

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
      className="flex h-[34px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-line px-3 text-[13px] font-bold text-ink-2"
    >
      <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
      {label}
    </button>
  );
}
