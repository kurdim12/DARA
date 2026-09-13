import { useState } from "react";
import type { AnalyzeResponse, Lang } from "../../shared/types";
import { HighlightedMessage } from "../components/HighlightedMessage";
import { VerdictBand } from "../components/VerdictBand";
import { Page, PrimaryButton, SectionTitle } from "../components/Layout";
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
    <Page>
      <h1 className="text-2xl font-bold">/lab</h1>

      <textarea
        dir="auto"
        rows={7}
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="mt-4 w-full border-2 border-ink bg-paper p-3 text-base"
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
            className={`border px-3 py-1.5 ${
              lang === option ? "border-ink bg-ink text-paper" : "border-rule"
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
          <VerdictBand verdict={result.verdict} />
          <p className="mt-4 text-xl">{result.headline}</p>
          <p className="mt-2 text-sm text-ink-2">
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
          <SectionTitle>Raw</SectionTitle>
          <pre dir="ltr" className="overflow-x-auto border border-rule p-3 text-xs">
            {raw}
          </pre>
        </div>
      )}
    </Page>
  );
}
