import { useState } from "react";
import { cacheMeta, hasCachedVerdict, stagedMessages } from "../lib/demo";
import { clearLocalHistory, isTestMode, setTestMode } from "../lib/storage";
import { useI18n } from "../i18n";

/**
 * Rehearsal aid, reached only by a long press on the mark. Nothing links to
 * it and nothing hints at it on screen.
 */
export function DemoTray({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (text: string) => void;
}) {
  const { t } = useI18n();
  const [testMode, setTestModeState] = useState(isTestMode);
  const staged = stagedMessages();

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/50" onClick={onClose}>
      <div
        className="max-h-[80dvh] w-full overflow-y-auto rounded-t-scanner border-t border-line bg-card p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="t-h3">{t("demo.title")}</h2>
          <button type="button" onClick={onClose} className="tap t-sub">
            {t("demo.close")}
          </button>
        </div>

        {/*
          Which build this phone is actually running. If it does not match the
          latest commit, the phone is holding a cached copy — close the tab or
          the installed app and open it again.
        */}
        <p className="tnum mt-1 text-[12px] text-slate">
          build <bdi>{__BUILD_ID__}</bdi>
        </p>

        {staged.length === 0 ? (
          <p className="t-sub mt-4">
            No staged messages — every case marked <code>demo: true</code> in
            content/eval-cases.json still has placeholder text.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {staged.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item.text)}
                  dir="auto"
                  className="w-full rounded-row border border-line p-3 text-start text-[15px] leading-snug"
                >
                  <span className="block text-[11px] font-bold uppercase tracking-widest text-slate">
                    {item.id}
                    {/* No saved verdict yet means no airplane-mode fallback for
                        this one — worth knowing before a rehearsal. */}
                    {!hasCachedVerdict(item.id) && (
                      <span className="ms-2 text-slate">no saved result</span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 block">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="mt-6 flex items-center gap-3 text-[15px]">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => {
              setTestMode(e.target.checked);
              setTestModeState(e.target.checked);
            }}
            className="size-5 accent-[var(--blue)]"
          />
          {t("demo.test_mode")}
        </label>

        <button
          type="button"
          onClick={() => {
            clearLocalHistory();
            setTestModeState(false);
          }}
          className="mt-5 h-[50px] w-full rounded-btn border border-line text-[16px] font-bold"
        >
          {t("demo.reset")}
        </button>

        {cacheMeta.generated_at && (
          <p className="mt-4 text-[12px] text-slate">
            <bdi>
              {cacheMeta.model} · {cacheMeta.generated_at}
            </bdi>
          </p>
        )}
      </div>
    </div>
  );
}
