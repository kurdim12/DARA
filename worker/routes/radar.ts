import campaignsFile from "../../content/campaigns.json";

/**
 * The Jordan radar: what DARA' itself has been told, this week and in total.
 *
 * Every number here is a count of rows in D1. Nothing is modelled, projected
 * or filled in — when there are no rows the arrays come back empty and the
 * screen says so, because "no data yet" is a true statement and a number is
 * only true if a row is behind it. Rehearsal rows (is_test) never count.
 */

export interface RadarRow {
  key: string;
  count: number;
}

export interface RadarResponse {
  generated_at: string;
  reports_total: number;
  verified_campaigns: number;
  this_week: {
    from: string;
    to: string;
    total: number;
    by_category: RadarRow[];
    by_entity: RadarRow[];
  };
  trend: { week_start: string; count: number }[];
  top_hosts: RadarRow[];
  top_numbers: RadarRow[];
}

/** Campaigns a person has signed off. The screen counts these, not all of them. */
function verifiedCampaignCount(): number {
  const list = (campaignsFile as { campaigns: { verified?: boolean }[] }).campaigns;
  return list.filter((entry) => entry.verified === true).length;
}

/** Monday of the week a timestamp falls in, in SQLite. */
const WEEK_START = "date(created_at, '-' || ((strftime('%w', created_at) + 6) % 7) || ' days')";

const LIVE = "is_test = 0";

/**
 * A host as it appears in reported text — never a host we went and looked up.
 *
 * The trailing set includes "." because a scam message very often ends on its
 * link, and a host followed by a full stop was silently not being counted.
 */
export function hostsIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/\bhttps?:\/\/([^\s/?#"'<>)]+)|(?:^|\s)((?:[a-z0-9-]+\.)+[a-z]{2,})(?=[\s/,:).]|$)/gi)) {
    const host = (match[1] ?? match[2] ?? "").toLowerCase().replace(/^www\./, "").replace(/[.,]+$/, "");
    if (host.includes(".")) out.push(host);
  }
  return out;
}

/**
 * Numbers long enough to be a phone number. Deliberately blunt: a token that
 * is not one just will not repeat often enough to reach a top list.
 */
export function numbersIn(text: string): string[] {
  const out: string[] = [];
  for (const match of text.matchAll(/(?:\+?\d[\d\s-]{7,17}\d)/g)) {
    const digits = match[0].replace(/[\s-]/g, "");
    if (digits.length >= 8) out.push(digits);
  }
  return out;
}

export function tally(values: string[], limit = 5): RadarRow[] {
  const counts = new Map<string, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

export async function radar(db: D1Database): Promise<RadarResponse> {
  const [week, byCategory, byEntity, total, trend, texts] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS n,
                date('now', '-6 days') AS from_day,
                date('now')            AS to_day
           FROM reports
          WHERE ${LIVE} AND date(created_at) >= date('now', '-6 days')`,
      )
      .first<{ n: number; from_day: string; to_day: string }>(),
    db
      .prepare(
        `SELECT category AS key, COUNT(*) AS count
           FROM reports
          WHERE ${LIVE} AND date(created_at) >= date('now', '-6 days')
          GROUP BY category ORDER BY count DESC, key ASC`,
      )
      .all<RadarRow>(),
    db
      .prepare(
        `SELECT impersonated_entity AS key, COUNT(*) AS count
           FROM reports
          WHERE ${LIVE} AND date(created_at) >= date('now', '-6 days')
            AND impersonated_entity IS NOT NULL AND trim(impersonated_entity) <> ''
          GROUP BY impersonated_entity ORDER BY count DESC, key ASC`,
      )
      .all<RadarRow>(),
    db.prepare(`SELECT COUNT(*) AS n FROM reports WHERE ${LIVE}`).first<{ n: number }>(),
    db
      .prepare(
        `SELECT ${WEEK_START} AS week_start, COUNT(*) AS count
           FROM reports
          WHERE ${LIVE} AND date(created_at) >= date('now', '-55 days')
          GROUP BY week_start ORDER BY week_start ASC`,
      )
      .all<{ week_start: string; count: number }>(),
    db
      .prepare(
        `SELECT message_text FROM reports
          WHERE ${LIVE} AND message_text IS NOT NULL AND trim(message_text) <> ''
          ORDER BY id DESC LIMIT 400`,
      )
      .all<{ message_text: string }>(),
  ]);

  const reported = (texts.results ?? []).map((row) => row.message_text);

  return {
    generated_at: new Date().toISOString(),
    reports_total: total?.n ?? 0,
    verified_campaigns: verifiedCampaignCount(),
    this_week: {
      from: week?.from_day ?? "",
      to: week?.to_day ?? "",
      total: week?.n ?? 0,
      by_category: byCategory.results ?? [],
      by_entity: byEntity.results ?? [],
    },
    trend: trend.results ?? [],
    top_hosts: tally(reported.flatMap(hostsIn)),
    top_numbers: tally(reported.flatMap(numbersIn)),
  };
}
