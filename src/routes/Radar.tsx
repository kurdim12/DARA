import { useCallback, useEffect, useState } from "react";
import { BottomNav } from "../components/BottomNav";
import { CampaignCard } from "../components/CampaignCard";
import { RadarNumbers } from "../components/RadarNumbers";
import { ThreatRow } from "../components/ThreatRow";
import { Card, Chip, ChipRow, Header, ListCard, Page } from "../components/Shell";
import { AppError, fetchRadar, type RadarData } from "../lib/api";
import { useI18n, type TextKey } from "../i18n";
import { CAMPAIGN_FILTERS, campaigns, inFilter, type CampaignFilter } from "../lib/campaigns";
import { allThreats, reportCounts } from "../lib/threats";
import type { Route } from "../lib/router";

type Segment = "radar" | "campaigns" | "patterns";

const SEGMENTS: { id: Segment; label: TextKey }[] = [
  { id: "radar", label: "radar.seg_radar" },
  { id: "campaigns", label: "camp.tab_campaigns" },
  { id: "patterns", label: "camp.tab_patterns" },
];

const FILTER_LABEL: Record<CampaignFilter, TextKey> = {
  all: "camp.filter_all",
  gov: "camp.filter_gov",
  banks: "camp.filter_banks",
  deepfake: "camp.filter_deepfake",
};

/**
 * The radar. Two things live here and they are deliberately not mixed:
 *
 *   Campaigns — a scam somebody documented, with a date and a named source.
 *   Patterns  — the shape of a message the engine knows, which is a
 *               description and not an incident.
 *
 * Keeping them apart is the honest split: one says "this happened and here is
 * who reported it", the other says "messages like this exist".
 */
export function Radar({
  navigate,
  onCheckSample,
}: {
  navigate: (route: Route) => void;
  onCheckSample: (text: string) => void;
}) {
  const { t, lang } = useI18n();
  const [segment, setSegment] = useState<Segment>("radar");
  const [filter, setFilter] = useState<CampaignFilter>("all");
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [numbers, setNumbers] = useState<
    { state: "loading" } | { state: "ready"; radar: RadarData } | { state: "error"; key: TextKey }
  >({ state: "loading" });

  useEffect(() => {
    let live = true;
    void reportCounts().then((next) => live && setCounts(next));
    return () => {
      live = false;
    };
  }, []);

  const load = useCallback(() => {
    let live = true;
    setNumbers({ state: "loading" });
    fetchRadar()
      .then((radar) => live && setNumbers({ state: "ready", radar }))
      .catch((error) =>
        live &&
        setNumbers({ state: "error", key: error instanceof AppError ? error.key : "radar.error" }),
      );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => load(), [load]);

  const shown = campaigns(lang).filter((entry) => inFilter(entry, filter));

  return (
    <>
      <Page>
        <Header title={t("radar.title")} />

        <div className="flex gap-1 rounded-full bg-line p-1">
          {SEGMENTS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={segment === id}
              onClick={() => setSegment(id)}
              // "Documented campaigns" needs two lines at this width, so the
              // pills size to their content and stay the same height as each
              // other rather than one of them growing alone.
              className={`press flex min-h-9 flex-1 items-center justify-center rounded-full px-2 py-1.5 text-center text-[12.5px] font-bold leading-tight ${
                segment === id ? "bg-card text-ink" : "text-ink-2"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {segment === "radar" ? (
          <>
            <p className="t-sub mt-3">{t("radar.sub")}</p>
            {numbers.state === "loading" && (
              <Card className="mt-3">
                <p className="t-sub">…</p>
              </Card>
            )}
            {numbers.state === "error" && (
              <Card className="mt-3">
                <p role="alert" className="t-body text-red-ink">
                  {t(numbers.key)}
                </p>
                <button
                  type="button"
                  onClick={load}
                  className="tap mt-2 text-[13px] font-bold text-ink"
                >
                  {t("radar.retry")}
                </button>
              </Card>
            )}
            {numbers.state === "ready" && <RadarNumbers radar={numbers.radar} />}
          </>
        ) : segment === "campaigns" ? (
          <>
            <p className="t-sub mt-3">{t("camp.sub")}</p>
            <div className="mt-3">
              <ChipRow>
                {CAMPAIGN_FILTERS.map((id) => (
                  <Chip
                    key={id}
                    label={t(FILTER_LABEL[id])}
                    selected={filter === id}
                    onClick={() => setFilter(id)}
                  />
                ))}
              </ChipRow>
            </div>

            {shown.length === 0 ? (
              <Card className="mt-3">
                <p className="t-sub">{t("camp.empty")}</p>
              </Card>
            ) : (
              <div className="mt-3 space-y-2.5">
                {shown.map((campaign) => (
                  <CampaignCard
                    key={campaign.id}
                    campaign={campaign}
                    onCheckSample={onCheckSample}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="t-sub mt-3">{t("camp.patterns_sub")}</p>
            <ListCard className="mt-3">
              {allThreats().map((threat) => (
                <ThreatRow
                  key={threat.id}
                  threat={threat}
                  count={counts[threat.category] ?? 0}
                  level={2}
                />
              ))}
            </ListCard>
          </>
        )}
      </Page>
      <BottomNav active="radar" navigate={navigate} />
    </>
  );
}
