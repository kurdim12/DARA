import { useState } from "react";
import { cacheMeta, stagedMessages } from "../lib/demo";
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
    <div className="fixed inset-0 z-50 flex items-end bg-ink/40" onClick={onClose}>
      <div
        className="max-h-[80dvh] w-full overflow-y-auto border-t-2 border-ink bg-paper p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">{t("demo.title")}</h2>
          <button type="button" onClick={onClose} className="text-ink-70">
            {t("demo.close")}
          </button>
        </div>

        {staged.length === 0 ? (
          <p className="mt-4 text-base text-ink-70">
            No staged messages yet — run <code>npm run cache-demo</code>.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {staged.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onPick(item.text)}
                  dir="auto"
                  className="w-full border border-ink-20 p-3 text-start text-base leading-snug"
                >
                  <span className="block text-xs uppercase tracking-widest text-ink-55">
                    {item.id}
                  </span>
                  <span className="mt-1 line-clamp-2 block">{item.text}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <label className="mt-6 flex items-center gap-3 text-base">
          <input
            type="checkbox"
            checked={testMode}
            onChange={(e) => {
              setTestMode(e.target.checked);
              setTestModeState(e.target.checked);
            }}
            className="size-5 accent-black"
          />
          {t("demo.test_mode")}
        </label>

        <button
          type="button"
          onClick={() => {
            clearLocalHistory();
            setTestModeState(false);
          }}
          className="mt-5 w-full border-2 border-ink px-4 py-2.5 text-base font-semibold"
        >
          {t("demo.reset")}
        </button>

        {cacheMeta.generated_at && (
          <p className="mt-4 text-xs text-ink-55">
            <bdi>
              {cacheMeta.model} · {cacheMeta.generated_at}
            </bdi>
          </p>
        )}
      </div>
    </div>
  );
}
