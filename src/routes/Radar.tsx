import { useEffect, useState } from "react";
import { BottomNav } from "../components/BottomNav";
import { CampaignCard } from "../components/CampaignCard";
import { ThreatRow } from "../components/ThreatRow";
import { Card, Chip, ChipRow, Header, ListCard, Page } from "../components/Shell";
import { useI18n, type TextKey } from "../i18n";
import { CAMPAIGN_FILTERS, campaigns, inFilter, type CampaignFilter } from "../lib/campaigns";
import { allThreats, reportCounts } from "../lib/threats";
import type { Route } from "../lib/router";

type Segment = "campaigns" | "patterns";

const SEGMENTS: { id: Segment; label: TextKey }[] = [
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
  const [segment, setSegment] = useState<Segment>("campaigns");
  const [filter, setFilter] = useState<CampaignFilter>("all");
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    void reportCounts().then((next) => live && setCounts(next));
    return () => {
      live = false;
    };
  }, []);

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
              className={`press h-9 flex-1 rounded-full text-[13px] font-bold ${
                segment === id ? "bg-card text-ink" : "text-ink-2"
              }`}
            >
              {t(label)}
            </button>
          ))}
        </div>

        {segment === "campaigns" ? (
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
