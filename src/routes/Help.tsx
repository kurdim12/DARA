import { EyeOff, LifeBuoy, ShieldAlert } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import { HelpLines } from "../components/HelpLines";
import { Card, Header, IconRow, Page, RowChevron } from "../components/Shell";
import { useI18n } from "../i18n";
import type { Route } from "../lib/router";

/**
 * One door for "something has happened". Recover is the plan for afterwards;
 * the extortion shield is for while it is still happening. Both used to be
 * their own tab, which made a frightened person choose between two words
 * before they could get anywhere.
 *
 * The numbers sit under both, because either way that is what someone may
 * need — and each one says where it came from and when it was checked. The
 * list itself is the shared HelpLines component, so this screen and the Shield
 * screen can no longer drift into naming the same directorate two ways.
 */
export function Help({ navigate }: { navigate: (route: Route) => void }) {
  const { t } = useI18n();

  return (
    <>
      <Page>
        <Header title={t("help.title")} />
        <p className="t-sub -mt-1">{t("help.sub")}</p>

        <div className="mt-4 space-y-2.5">
          <IconRow
            as="card"
            Icon={LifeBuoy}
            title={t("help.recover")}
            sub={t("help.recover_sub")}
            trailing={<RowChevron />}
            onClick={() => navigate("recover")}
          />
          <IconRow
            as="card"
            Icon={ShieldAlert}
            tone="red"
            title={t("help.shield")}
            sub={t("help.shield_sub")}
            trailing={<RowChevron />}
            onClick={() => navigate("shield")}
          />
        </div>

        <h2 className="t-h3 mt-7">{t("shield.helplines")}</h2>
        <div className="mt-3">
          <HelpLines />
        </div>

        <Card className="mt-3 flex items-start gap-3">
          <EyeOff size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />
          <p className="t-sub flex-1">{t("shield.anon_note")}</p>
        </Card>
      </Page>
      <BottomNav active="help" navigate={navigate} />
    </>
  );
}
