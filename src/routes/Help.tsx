import { EyeOff, Phone, ShieldAlert, Wrench } from "lucide-react";
import { BottomNav } from "../components/BottomNav";
import {
  Card,
  Header,
  IconRow,
  ListCard,
  Page,
  RowChevron,
} from "../components/Shell";
import { useI18n } from "../i18n";
import { contacts } from "../lib/verified";
import type { Route } from "../lib/router";

/**
 * One door for "something has happened". Recover is the plan for afterwards;
 * the extortion shield is for while it is still happening. Both used to be
 * their own tab, which made a frightened person choose between two words
 * before they could get anywhere.
 *
 * The numbers sit under both, because either way that is what someone may
 * need — and each one says whether it has been checked.
 */
export function Help({ navigate }: { navigate: (route: Route) => void }) {
  const { t, lang } = useI18n();
  const lines = contacts(lang);

  return (
    <>
      <Page>
        <Header title={t("help.title")} />
        <p className="t-sub -mt-1">{t("help.sub")}</p>

        <div className="mt-4 space-y-2.5">
          <IconRow
            as="card"
            Icon={Wrench}
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
        <ListCard className="mt-3">
          {lines.map((line) => (
            <IconRow
              key={line.id}
              Icon={Phone}
              title={line.label}
              sub={line.number ? <bdi className="tnum">{line.number}</bdi> : t("shield.pending_number")}
              trailing={
                line.number ? (
                  <a
                    href={`tel:${line.number.replace(/\s/g, "")}`}
                    className="flex h-[34px] shrink-0 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[13px] font-bold text-white-brush"
                  >
                    <Phone size={15} strokeWidth={1.75} aria-hidden="true" />
                    {t("shield.call")}
                  </a>
                ) : (
                  <span className="flex h-[26px] shrink-0 items-center rounded-full border border-amber-ink px-2.5 text-[12px] font-bold text-amber-ink">
                    {t("shield.verify_tag")}
                  </span>
                )
              }
            />
          ))}
        </ListCard>

        <Card className="mt-3 flex items-start gap-3">
          <EyeOff size={20} strokeWidth={1.75} className="mt-0.5 shrink-0 text-green" aria-hidden="true" />
          <p className="t-sub flex-1">{t("shield.anon_note")}</p>
        </Card>
      </Page>
      <BottomNav active="help" navigate={navigate} />
    </>
  );
}
