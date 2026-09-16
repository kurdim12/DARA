import { Card } from "./Shell";
import { useI18n, type TextKey } from "../i18n";
import type { RadarData, RadarRow } from "../lib/api";
import { dateLocale } from "../lib/locale";

/**
 * What DARA' itself has been told, this week and in total.
 *
 * The three figures are deliberately never added up, and the line under them
 * says so: two are counts of reports that reached this platform, the third is
 * how many campaigns the team documented. None of it is a national statistic
 * and the screen says that out loud, because it is the first thing a jury will
 * assume otherwise.
 */
export function RadarNumbers({ radar }: { radar: RadarData }) {
  const { t, lang } = useI18n();
  const week = radar.this_week;

  const day = (iso: string) =>
    iso
      ? new Date(iso).toLocaleDateString(dateLocale(lang), {
          month: "short",
          day: "numeric",
        })
      : "";

  return (
    <>
      <p className="t-meta mt-3 text-ink-2">
        <bdi>
          {day(week.from)} — {day(week.to)}
        </bdi>
      </p>

      <div className="mt-2 grid grid-cols-3 gap-2">
        <Stat value={week.total} label={t("radar.stat_week")} />
        <Stat value={radar.reports_total} label={t("radar.stat_total")} />
        <Stat value={radar.verified_campaigns} label={t("radar.stat_campaigns")} />
      </div>
      <p className="t-sub mt-2 text-[12px] leading-relaxed">{t("radar.stat_note")}</p>

      {week.total === 0 ? (
        <Card className="mt-3">
          <p className="t-sub">{t("radar.empty_week")}</p>
        </Card>
      ) : (
        <>
          <Block title={t("radar.categories")}>
            <Rows
              rows={week.by_category.map((row) => ({
                ...row,
                label: t(`category.${row.key}` as TextKey),
              }))}
              empty={t("radar.empty_week")}
            />
          </Block>
          <Block title={t("radar.entities")}>
            <Rows
              rows={week.by_entity.map((row) => ({ ...row, label: row.key }))}
              empty={t("radar.empty_entities")}
              mono
            />
          </Block>
        </>
      )}

      <Block title={t("radar.trend")}>
        <Trend rows={radar.trend} emptyLabel={t("radar.empty_trend")} />
      </Block>

      <h3 className="t-h3 mt-6">{t("radar.top")}</h3>
      <Block title={t("radar.top_hosts")}>
        <Rows
          rows={radar.top_hosts.map((row) => ({ ...row, label: row.key }))}
          empty={t("radar.empty_top")}
          mono
        />
      </Block>
      <Block title={t("radar.top_numbers")}>
        <Rows
          rows={radar.top_numbers.map((row) => ({ ...row, label: row.key }))}
          empty={t("radar.empty_top")}
          mono
        />
      </Block>

      <p className="t-meta mt-3 text-center text-ink-2">
        <bdi>
          {t("radar.generated").replace(
            "{d}",
            new Date(radar.generated_at).toLocaleString(dateLocale(lang), {
              dateStyle: "medium",
              timeStyle: "short",
            }),
          )}
        </bdi>
      </p>
    </>
  );
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <div className="rounded-row border border-line bg-card px-3 py-3 text-center">
      <p className="tnum font-display text-[24px] font-extrabold leading-none">
        <bdi>{value}</bdi>
      </p>
      <p className="t-meta mt-1.5 leading-snug text-ink-2">{label}</p>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="mt-2.5">
      <p className="t-eyebrow">{title}</p>
      <div className="mt-2.5">{children}</div>
    </Card>
  );
}

function Rows({
  rows,
  empty,
  mono = false,
}: {
  rows: (RadarRow & { label: string })[];
  empty: string;
  mono?: boolean;
}) {
  if (rows.length === 0) return <p className="t-sub">{empty}</p>;
  const most = Math.max(...rows.map((row) => row.count), 1);
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.key}>
          <div className="flex items-baseline justify-between gap-2">
            <bdi
              dir={mono ? "ltr" : "auto"}
              className={`min-w-0 break-all text-[13px] ${mono ? "font-medium" : ""}`}
            >
              {row.label}
            </bdi>
            <bdi className="tnum shrink-0 text-[12px] font-bold text-ink-2">{row.count}</bdi>
          </div>
          <span aria-hidden="true" className="mt-1 block h-1 rounded-full bg-line">
            <span
              className="block h-1 rounded-full bg-ink"
              style={{ width: `${Math.max(6, Math.round((row.count / most) * 100))}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Trend({
  rows,
  emptyLabel,
}: {
  rows: { week_start: string; count: number }[];
  emptyLabel: string;
}) {
  const most = Math.max(...rows.map((row) => row.count), 0);
  if (rows.length === 0 || most === 0) return <p className="t-sub">{emptyLabel}</p>;
  return (
    <ul className="flex h-16 items-end gap-1.5">
      {rows.map((row) => (
        <li
          key={row.week_start}
          className="flex h-full flex-1 items-end"
          aria-label={`${row.week_start}: ${row.count}`}
        >
          <span
            className="block w-full rounded-t-[3px] bg-ink"
            style={{ height: `${Math.max(6, Math.round((row.count / most) * 100))}%` }}
          />
        </li>
      ))}
    </ul>
  );
}
