import { useState } from "react";
import type { AnalyzeResponse, Lang } from "../../shared/types";
import { HighlightedMessage } from "../components/HighlightedMessage";
import { Page, PrimaryButton, SectionLabel } from "../components/Shell";
import { useI18n } from "../i18n";

/**
 * Hidden route for testing the engine on a phone. Nothing links here.
 * It calls the API directly so the raw output is visible next to the render.
 */
export function Lab() {
  const { setLang } = useI18n();
  const [text, setText] = useState("");
  const [lang, setEngineLang] = useState<Lang>("ar");
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState<string>("");
  const [result, setResult] = useState<AnalyzeResponse | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    setRaw("");
    const startedAt = performance.now();
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), lang }),
      });
      const body = await res.json();
      setRaw(JSON.stringify({ http: res.status, ...body }, null, 2));
      if (res.ok) setResult(body as AnalyzeResponse);
    } catch (error) {
      setRaw(String(error));
    } finally {
      setRaw((prev) => `round trip: ${Math.round(performance.now() - startedAt)} ms\n${prev}`);
      setBusy(false);
    }
  }

  return (
    <Page withNav={false}>
      <h1 className="t-title pt-14">/lab</h1>

      <textarea
        dir="auto"
        rows={7}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-4 w-full rounded-btn border border-line bg-card p-3 text-[15px]"
      />

      <div className="mt-3 flex gap-2">
        {(["ar", "en"] as Lang[]).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => {
              setEngineLang(option);
              setLang(option);
            }}
            className={`rounded-full border px-3 py-1.5 ${
              lang === option ? "border-blue bg-blue text-white" : "border-line"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mt-4">
        <PrimaryButton onClick={run} disabled={busy || !text.trim()}>
          {busy ? "…" : "Run"}
        </PrimaryButton>
      </div>

      {result && (
        <div className="mt-8">
          <p className="t-title">{result.verdict}</p>
          <p className="mt-4 text-[17px]">{result.headline}</p>
          <p className="t-sub mt-2">
            <bdi>
              {result.confidence}% · {result.category} · {result.model} ·{" "}
              {result.latency_ms} ms
            </bdi>
          </p>
          <div className="mt-5">
            <HighlightedMessage text={text.trim()} flags={result.red_flags} />
          </div>
          <ul className="mt-5 space-y-2">
            {result.red_flags.map((flag, index) => (
              <li key={index} className="text-base">
                <bdi>{index + 1}</bdi> — {flag.why}
              </li>
            ))}
          </ul>
          <ul className="mt-5 space-y-2">
            {result.actions.map((action, index) => (
              <li key={index} className="text-base">
                {action}
              </li>
            ))}
          </ul>
        </div>
      )}

      {raw && (
        <div className="mt-8">
          <SectionLabel>Raw</SectionLabel>
          <pre dir="ltr" className="mt-2 overflow-x-auto rounded-btn border border-line p-3 text-[12px]">
            {raw}
          </pre>
        </div>
      )}
    </Page>
  );
}
