import { useEffect, useRef, useState } from "react";
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
    <div className="mt-10 border-y border-rule bg-paper-2 py-8 text-center">
      <span className="block text-[13px] uppercase tracking-widest text-ink-2">
        {t("report.case")}
      </span>
      <bdi ref={numberRef} className="mt-3 block font-kufi text-[32px] font-bold tracking-tight">
        {value}
      </bdi>
      <button
        type="button"
        onClick={copy}
        aria-live="polite"
        className="mt-4 min-h-11 border-2 border-ink px-5 text-base font-semibold"
      >
        {copied ? t("report.copied") : t("report.copy")}
      </button>
    </div>
  );
}
