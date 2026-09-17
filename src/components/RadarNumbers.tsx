import { Card } from "./Shell";
import { useI18n, type TextKey } from "../i18n";
import type { RadarData, RadarRow } from "../lib/api";
import type { Lang } from "../../shared/types";
import { dateLocale } from "../lib/locale";

/**
 * What DARA' itself has been told, and what the team documented.
 *
 * Two figures, never added up, and the line under them says so: one counts
 * reports that reached this platform, the other counts campaigns the team
 * documented from published sources. None of it is a national statistic and
 * the screen says that out loud, because it is the first thing a jury will
 * assume otherwise.
 *
 * It used to be three cards, and when a young platform has had all its reports
 * this week the first two hold the same number — «6» beside «6» reads as a
 * duplication, not as two facts. The week is a line under the platform count
 * now, so there is nothing to mistake for double-counting.
 */
export function RadarNumbers({
  radar,
  onSeeCampaigns,
}: {
  radar: RadarData;
  /** Low data makes the documented campaigns the real content. */
  onSeeCampaigns?: () => void;
}) {
  const { t, lang } = useI18n();
  const week = radar.this_week;

  const byCategory = week.by_category.map((row) => ({
    ...row,
    label: t(`category.${row.key}` as TextKey),
  }));
  const byEntity = week.by_entity.map((row) => ({ ...row, label: row.key }));
  const topHosts = radar.top_hosts.map((row) => ({ ...row, label: row.key }));
  const topNumbers = radar.top_numbers.map((row) => ({ ...row, label: row.key }));
  const hasTrend = radar.trend.some((row) => row.count > 0);
  // Nothing worth charting yet. One sentence beats four empty cards.
  const thin =
    byCategory.length === 0 &&
    byEntity.length === 0 &&
    topHosts.length === 0 &&
    topNumbers.length === 0;

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

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Stat
          value={radar.reports_total}
          label={t("radar.stat_platform")}
          note={
            week.total === radar.reports_total
              ? t("radar.stat_all_week")
              : t("radar.stat_week_of").replace("{n}", String(week.total))
          }
        />
        <Stat value={radar.verified_campaigns} label={t("radar.stat_campaigns")} />
      </div>
      <p className="t-sub mt-2 text-[12px] leading-relaxed">{t("radar.stat_note")}</p>

      <Block title={t("radar.categories")} rows={byCategory.length}>
        <Rows rows={byCategory} />
      </Block>
      <Block title={t("radar.entities")} rows={byEntity.length}>
        <Rows rows={byEntity} mono />
      </Block>
      <Block title={t("radar.trend")} rows={hasTrend ? 1 : 0}>
        <Trend rows={radar.trend} lang={lang} axis={t("radar.trend_axis")} />
      </Block>

      {(topHosts.length > 0 || topNumbers.length > 0) && (
        <>
          <h3 className="t-h3 mt-6">{t("radar.top")}</h3>
          <Block title={t("radar.top_hosts")} rows={topHosts.length}>
            <Rows rows={topHosts} mono />
          </Block>
          <Block title={t("radar.top_numbers")} rows={topNumbers.length}>
            <Rows rows={topNumbers} mono />
          </Block>
        </>
      )}

      {/* Said once, as a sentence, instead of four cards each announcing that
          they are empty. At this volume the documented campaigns are the
          content — so the page says so and opens them. */}
      {thin && (
        <Card className="mt-3">
          <p className="t-sub">{t("radar.low_data")}</p>
          {onSeeCampaigns && (
            <button
              type="button"
              onClick={onSeeCampaigns}
              className="press tap mt-2.5 flex items-center gap-1.5 text-[14px] font-bold text-ink underline underline-offset-2"
            >
              {t("radar.see_campaigns")}
            </button>
          )}
        </Card>
      )}

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

function Stat({ value, label, note }: { value: number; label: string; note?: string }) {
  return (
    <div className="rounded-row border border-line bg-card px-3 py-3.5 text-center">
      <p className="tnum font-display text-[30px] font-extrabold leading-none">
        <bdi>{value}</bdi>
      </p>
      <p className="t-meta mt-2 leading-snug text-ink-2">{label}</p>
      {note && <p className="t-meta mt-1 leading-snug text-ink-2 opacity-75">{note}</p>}
    </div>
  );
}

/** Renders nothing when it has nothing. An empty card is a cell saying "no data". */
function Block({
  title,
  rows,
  children,
}: {
  title: string;
  rows: number;
  children: React.ReactNode;
}) {
  if (rows === 0) return null;
  return (
    <Card className="mt-2.5">
      <p className="t-eyebrow">{title}</p>
      <div className="mt-2.5">{children}</div>
    </Card>
  );
}

function Rows({
  rows,
  mono = false,
}: {
  rows: (RadarRow & { label: string })[];
  mono?: boolean;
}) {
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
            <bdi className="tnum shrink-0 text-[14px] font-extrabold">{row.count}</bdi>
          </div>
          <span aria-hidden="true" className="mt-1.5 block h-2 rounded-full bg-line">
            <span
              className="block h-2 rounded-full bg-red"
              style={{ width: `${Math.max(6, Math.round((row.count / most) * 100))}%` }}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function weekLabel(iso: string, lang: Lang): string {
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(dateLocale(lang), {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Eight weeks of reports.
 *
 * It was eight black bars with no values and no axis, two of them non-zero and
 * the rest a wide flat gap — a chart that showed a shape nobody could read.
 * Every bar that exists now carries its count above it, the axis names what is
 * being counted, and the weeks are labelled at both ends and the middle, which
 * is as many labels as 375px holds without them colliding.
 *
 * The Block above renders nothing when there is nothing, so this is never the
 * empty case.
 */
function Trend({
  rows,
  lang,
  axis,
}: {
  rows: { week_start: string; count: number }[];
  lang: Lang;
  axis: string;
}) {
  const most = Math.max(...rows.map((row) => row.count), 1);
  const middle = Math.floor((rows.length - 1) / 2);

  return (
    <>
      <p className="t-meta text-ink-2">{axis}</p>
      <ul className="mt-2 flex h-20 items-end gap-1.5">
        {rows.map((row) => (
          <li
            key={row.week_start}
            className="flex h-full flex-1 flex-col justify-end"
            aria-label={`${row.week_start}: ${row.count}`}
          >
            {/* The value rides above its own bar, so a reader never has to
                measure one against another to find out what it says. */}
            {row.count > 0 && (
              <bdi className="tnum block text-center text-[11.5px] font-extrabold leading-none">
                {row.count}
              </bdi>
            )}
            {/* A week with nothing in it gets no bar, only the rule below it.
                A floor height here would draw a quiet week as a small one. */}
            <span
              aria-hidden="true"
              className="mt-1 block w-full rounded-t-[3px] bg-red"
              style={{
                height: row.count === 0 ? 0 : `${Math.max(10, Math.round((row.count / most) * 88))}%`,
              }}
            />
          </li>
        ))}
      </ul>
      {/* Three labels, not eight columns each holding one. Eight cells at
          375px are ~40px wide and clipped «27 ت…» off every date that did not
          fit; laid out as start / centre / end they have the whole width to
          share and nothing truncates. */}
      <div className="mt-1.5 flex items-baseline justify-between gap-2 border-t border-line pt-1.5">
        {[0, middle, rows.length - 1]
          .filter((index, at, all) => all.indexOf(index) === at && rows[index])
          .map((index) => (
            <bdi key={rows[index].week_start} className="t-meta whitespace-nowrap text-ink-2">
              {weekLabel(rows[index].week_start, lang)}
            </bdi>
          ))}
      </div>
    </>
  );
}
