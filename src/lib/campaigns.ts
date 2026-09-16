import file from "../../content/campaigns.json";
import type { Lang } from "../../shared/types";

/**
 * Documented campaigns: a scam someone reported, with a date and a named
 * source. Not a pattern description and not something DARA' detected — the
 * card always shows who documented it and links to them.
 *
 * A record renders only while `verified` is true, the same rule every other
 * sourced claim in this app follows.
 */
export interface Campaign {
  id: string;
  date: string;
  tone: "red" | "amber" | "teal" | "violet";
  category: string;
  channel: string;
  title: string;
  summary: string;
  entity: string;
  domain?: string;
  officialDomain?: string;
  sourceName: string;
  sourceUrl?: string;
  sourceUrl2?: string;
  sample?: string;
  signals: string[];
}

interface Raw {
  id: string;
  date: string;
  tone: Campaign["tone"];
  category: string;
  channel: string;
  title_ar: string;
  title_en: string;
  summary_ar: string;
  summary_en: string;
  entity_ar: string;
  entity_en: string;
  domain?: string;
  official_domain?: string;
  source_name_ar: string;
  source_name_en: string;
  source_url?: string;
  source_url_2?: string;
  sample_text_ar?: string;
  signals?: string[];
  verified: boolean;
}

/** The filters the reference groups campaigns by. */
export const CAMPAIGN_FILTERS = ["all", "gov", "banks", "deepfake"] as const;
export type CampaignFilter = (typeof CAMPAIGN_FILTERS)[number];

const IN_FILTER: Record<Exclude<CampaignFilter, "all">, string[]> = {
  gov: ["traffic_fine", "impersonation_government", "parcel_customs"],
  banks: ["impersonation_bank", "otp_theft"],
  deepfake: ["investment"],
};

/**
 * The wanted language, or the other one when it is missing.
 *
 * Eleven of the fifteen records carry only an Arabic summary and source name;
 * the reference build has the same gap. Falling back shows the real sourced
 * text instead of a blank, and a campaign card with no visible source is
 * exactly what the sourcing rule exists to prevent. Every consumer renders
 * these with dir="auto", so a fallen-back Arabic line still sets right to left
 * inside an English screen.
 */
function pick(ar: string | undefined, en: string | undefined, lang: Lang): string {
  const wanted = lang === "ar" ? ar : en;
  return (wanted && wanted.trim()) || (lang === "ar" ? en : ar) || "";
}

export function campaigns(lang: Lang): Campaign[] {
  return (file.campaigns as Raw[])
    .filter((entry) => entry.verified === true)
    .map((entry) => ({
      id: entry.id,
      date: entry.date,
      tone: entry.tone,
      category: entry.category,
      channel: entry.channel,
      title: pick(entry.title_ar, entry.title_en, lang),
      summary: pick(entry.summary_ar, entry.summary_en, lang),
      entity: pick(entry.entity_ar, entry.entity_en, lang),
      domain: entry.domain,
      officialDomain: entry.official_domain,
      sourceName: pick(entry.source_name_ar, entry.source_name_en, lang),
      sourceUrl: entry.source_url,
      sourceUrl2: entry.source_url_2,
      sample: entry.sample_text_ar,
      signals: entry.signals ?? [],
    }))
    // Newest first: a campaign from last month matters more than one from last year.
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function inFilter(campaign: Campaign, filter: CampaignFilter): boolean {
  return filter === "all" || IN_FILTER[filter].includes(campaign.category);
}

/** The one date format, so a strip and a card never disagree. */
export function campaignDate(iso: string, lang: Lang): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString(lang === "ar" ? "ar-JO" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** How many campaigns a person has signed off — the number Radar shows. */
export function verifiedCount(): number {
  return (file.campaigns as Raw[]).filter((entry) => entry.verified === true).length;
}
