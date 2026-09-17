import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { AnalysisType } from "../../shared/types";
import { BottomNav } from "../components/BottomNav";
import { JordanLayerRows } from "../components/JordanLayer";
import {
  Card,
  FieldLabel,
  Header,
  IconRow,
  ListCard,
  Page,
  Toggle,
} from "../components/Shell";
import { AppError, lookup, type LookupResult } from "../lib/api";
import { entities, searchEntities } from "../lib/entities";
import { checklist } from "../lib/plans";
import { useI18n, type TextKey } from "../i18n";
import type { Route } from "../lib/router";

type Segment = "directory" | "checklist";

const HINT_STYLE: Record<LookupResult["hint"], string> = {
  official: "bg-line text-green",
  known_scam: "bg-red-soft text-red-ink",
  suspicious: "bg-line text-amber-ink",
  unknown: "bg-line text-ink-2",
};

const HINT_LABEL: Record<LookupResult["hint"], TextKey> = {
  official: "radar.hint_official",
  known_scam: "radar.hint_known_scam",
  suspicious: "radar.hint_suspicious",
  unknown: "radar.hint_unknown",
};

/**
 * Two things that answer the same question — "is this really them?" — and used
 * to live apart. The lookup says what DARA' can confirm about one value; the
 * directory is the list to check it against yourself. The ten-minute checklist
 * keeps its own tab.
 */
export function Protect({
  navigate,
  onCheck,
  focusLookup = false,
  onLookupFocused,
}: {
  navigate: (route: Route) => void;
  /** Hands the value to Scan with the right chip already chosen. */
  onCheck: (text: string, type: AnalysisType) => void;
  /** True when Home's "Check before you pay" opened this screen. */
  focusLookup?: boolean;
  onLookupFocused?: () => void;
}) {
  const { t, lang } = useI18n();
  const [segment, setSegment] = useState<Segment>("directory");
  const lookupRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [result, setResult] = useState<
    { state: "idle" } | { state: "loading" } | { state: "ready"; result: LookupResult } | { state: "error"; key: TextKey }
  >({ state: "idle" });
  // This visit only. Nothing is written to the device and nothing is sent.
  const [ticked, setTicked] = useState<Record<string, boolean>>({});

  // "Check before you pay" is the lookup, not the list, so it opens with the
  // cursor already there. The intent is consumed once: coming back to this
  // screen later should land on the directory as normal.
  useEffect(() => {
    if (!focusLookup) return;
    setSegment("directory");
    lookupRef.current?.focus();
    onLookupFocused?.();
  }, [focusLookup, onLookupFocused]);

  const items = checklist(lang);
  const done = items.filter((item) => ticked[item.id]).length;
  const list = searchEntities(entities(lang), search);

  async function run() {
    const value = query.trim();
    if (!value) return;
    setResult({ state: "loading" });
    try {
      setResult({ state: "ready", result: await lookup(value) });
    } catch (error) {
      setResult({
        state: "error",
        key: error instanceof AppError ? error.key : "radar.lookup_error",
      });
    }
  }

  return (
    <>
      <Page>
        <Header title={t("tool.protect")} />

        <div className="flex gap-1 rounded-full bg-line p-1">
          {(
            [
              ["directory", "dir.title"],
              ["checklist", "protect.checklist"],
            ] as [Segment, TextKey][]
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              aria-pressed={segment === id}
              onClick={() => setSegment(id)}
              className={`press flex min-h-9 flex-1 items-center justify-center rounded-full px-2 py-1.5 text-center text-[12.5px] font-bold leading-tight ${
                segment === id ? "bg-card text-ink" : "text-ink-2"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {segment === "directory" ? (
          <>
            <Card className="mt-3">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run();
                }}
              >
                <label htmlFor="lookup" className="t-row block">
                  {t("radar.lookup_label")}
                </label>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="lookup"
                    ref={lookupRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("radar.lookup_ph")}
                    className="h-11 min-w-0 flex-1 rounded-btn border border-line bg-paper px-3.5 text-[15px] text-ink outline-none placeholder:text-ink-2"
                  />
                  <button
                    type="submit"
                    disabled={query.trim().length === 0 || result.state === "loading"}
                    className={`h-11 shrink-0 rounded-btn px-4 text-[14px] font-bold ${
                      query.trim().length === 0 ? "bg-line text-ink-2" : "bg-ink text-paper"
                    }`}
                  >
                    {t("radar.lookup_cta")}
                  </button>
                </div>
              </form>
              <p className="t-sub mt-2 text-[12px]">{t("sh2.lookup_hint")}</p>

              {result.state === "error" && (
                <p role="alert" className="t-body mt-3 text-[14px] text-red-ink">
                  {t(result.key)}
                </p>
              )}

              {result.state === "ready" && (
                <div className="reveal mt-3 rounded-row border border-line p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <bdi dir="ltr" className="min-w-0 break-all text-[14px] font-semibold">
                      {result.result.query}
                    </bdi>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${HINT_STYLE[result.result.hint]}`}
                    >
                      {t(HINT_LABEL[result.result.hint])}
                    </span>
                  </div>
                  <div className="mt-2.5">
                    <JordanLayerRows layer={result.result.jordan_layer} />
                  </div>
                  {(result.result.kind === "domain" || result.result.kind === "number") && (
                    <button
                      type="button"
                      onClick={() =>
                        onCheck(
                          result.result.query,
                          result.result.kind === "domain" ? "link" : "call",
                        )
                      }
                      className="tap mt-2.5 text-[13px] font-bold text-ink underline underline-offset-2"
                    >
                      {t("learn.try_scanner")}
                    </button>
                  )}
                </div>
              )}
            </Card>

            <div className="mt-6">
              <FieldLabel>{t("dir.title")}</FieldLabel>
              <p className="t-sub mt-1">{t("dir.sub")}</p>
            </div>
            <div className="mt-2.5 flex items-center gap-2 rounded-btn border border-line bg-card px-3">
              <Search size={16} strokeWidth={1.75} aria-hidden="true" className="shrink-0 text-ink-2" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("dir.search")}
                aria-label={t("dir.search")}
                className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-2"
              />
            </div>

            {list.length === 0 ? (
              <Card className="mt-2.5">
                <p className="t-sub">{t("dir.empty")}</p>
              </Card>
            ) : (
              <ListCard className="mt-2.5">
                {list.map((entry) => (
                  <article key={entry.id} className="px-4 py-3.5">
                    <h3 dir="auto" className="t-row">
                      {entry.name}
                    </h3>
                    <bdi dir="ltr" className="mt-1 block break-all text-[13px] font-semibold text-ink-2">
                      {entry.domain}
                    </bdi>
                    <p dir="auto" className="t-sub mt-1.5">
                      {entry.never}
                    </p>
                  </article>
                ))}
              </ListCard>
            )}
            <p className="t-sub mt-2.5 text-[12px]">{t("dir.pending")}</p>
          </>
        ) : (
          <>
            <div className="mt-4 flex items-baseline justify-between gap-3">
              <FieldLabel>{t("protect.checklist")}</FieldLabel>
              <span className="t-meta shrink-0 text-ink-2">
                <bdi className="tnum">
                  {done} / {items.length}
                </bdi>{" "}
                {t("protect.completed")}
              </span>
            </div>

            <ListCard className="mt-2.5">
              {items.map((item) => {
                const on = Boolean(ticked[item.id]);
                const flip = () => setTicked((prev) => ({ ...prev, [item.id]: !prev[item.id] }));
                return (
                  <IconRow
                    key={item.id}
                    title={
                      <span className={on ? "text-ink-2 line-through" : undefined}>{item.title}</span>
                    }
                    sub={item.body}
                    trailing={<Toggle small on={on} onChange={flip} label={item.title} />}
                  />
                );
              })}
            </ListCard>

            <p className="t-sub mt-3">{t("protect.session_note")}</p>
          </>
        )}
      </Page>
      <BottomNav active="protect" navigate={navigate} />
    </>
  );
}
