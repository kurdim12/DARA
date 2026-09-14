import { useEffect, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { useI18n } from "../i18n";

/**
 * The case number, and a way to keep it. A person who has just reported an
 * extortion attempt should not have to retype this from a screenshot, and on
 * stage it has to be one tap.
 *
 * Clipboard access can be refused — an insecure origin, an older browser, a
 * permission prompt declined. When it is, the number is selected instead, so
 * the phone's own copy menu is one long-press away.
 */
export function CaseNumber({ value }: { value: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const numberRef = useRef<HTMLElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2500);
    } catch {
      const node = numberRef.current;
      if (!node) return;
      const range = document.createRange();
      range.selectNodeContents(node);
      const selection = getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  }

  return (
    <div className="mt-6 text-center">
      <p className="t-sub">{t("report.case")}</p>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        aria-label={copied ? t("report.copied") : t("report.copy")}
        // A mist pill on a mist page is not a pill. The card colour and a
        // hairline give the number the same shape against the page it sits on.
        className="mt-2 inline-flex min-h-12 items-center gap-3 rounded-full border border-line bg-card px-5 py-2"
      >
        <bdi ref={numberRef} className="tnum text-[28px] font-extrabold tracking-tight">
          {value}
        </bdi>
        <span className="text-slate" aria-hidden="true">
          {copied ? <Check size={20} strokeWidth={2.25} /> : <Copy size={20} strokeWidth={2} />}
        </span>
      </button>
    </div>
  );
}
