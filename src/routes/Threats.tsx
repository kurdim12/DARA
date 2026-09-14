import { useEffect, useState } from "react";
import { BottomNav } from "../components/BottomNav";
import { Card, Header, Page } from "../components/Shell";
import { ThreatRow } from "../components/ThreatRow";
import { useI18n } from "../i18n";
import { allThreats, reportCounts } from "../lib/threats";
import type { Route } from "../lib/router";

/** The whole of content/threats.json, from Home's "see all" link. */
export function Threats({ navigate }: { navigate: (route: Route) => void }) {
  const { t } = useI18n();
  const [counts, setCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    let live = true;
    void reportCounts().then((next) => live && setCounts(next));
    return () => {
      live = false;
    };
  }, []);

  return (
    <>
      <Page>
        <Header title={t("threats.title")} />
        <Card className="mt-3 divide-y divide-line overflow-hidden">
          {allThreats().map((threat) => (
            <ThreatRow key={threat.id} threat={threat} count={counts[threat.category] ?? 0} />
          ))}
        </Card>
      </Page>
      <BottomNav active="home" navigate={navigate} />
    </>
  );
}
