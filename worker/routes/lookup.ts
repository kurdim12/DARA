import campaignsFile from "../../content/campaigns.json";
import entitiesFile from "../../content/entities.json";
import factsFile from "../../content/lookup-facts.json";
import { registrableName } from "../engine/url";

/**
 * "Is this domain, number or alias one I should trust?"
 *
 * Every row the Jordan layer can show is either a lookup against content a
 * person has signed off (the entities directory, the documented campaigns) or
 * a count of rows in D1. Two rows — how old a domain is, and whether a threat
 * list carries it — need an outside service this Worker does not call, so they
 * come back null and the screen says "could not be checked" rather than
 * guessing. That sentence is the honest one and it is already in the UI.
 */

export type LookupKind = "domain" | "number" | "alias" | "unknown";
export type LookupHint = "official" | "known_scam" | "suspicious" | "unknown";

export interface JordanLayer {
  official_match?: { name_ar: string; name_en: string };
  claimed_entity_mismatch?: { entity_id: string; official_domain: string };
  domain_age_days?: number | null;
  urlhaus_listed?: boolean | null;
  tld?: string;
  tld_risk?: "high" | "medium" | "low";
  reports_count?: number;
  last_reported_at?: string;
  campaign_id?: string;
  operator?: "zain" | "orange" | "umniah" | "landline" | "foreign" | "unknown";
}

export interface LookupResponse {
  query: string;
  kind: LookupKind;
  hint: LookupHint;
  jordan_layer: JordanLayer;
}

interface Entity {
  id: string;
  name_ar: string;
  name_en: string;
  domain: string;
  verified?: boolean;
}

interface Campaign {
  id: string;
  domain?: string;
  official_domain?: string;
  verified?: boolean;
}

/** Only signed-off records are consulted. An unverified row is not a fact yet. */
const ENTITIES = (entitiesFile as { entries: Entity[] }).entries.filter((e) => e.verified === true);
const CAMPAIGNS = (campaignsFile as { campaigns: Campaign[] }).campaigns.filter(
  (c) => c.verified === true,
);

const FACTS = factsFile as {
  operator_prefixes: { verified: boolean; map: Record<string, string> };
  tld_risk: { verified: boolean; high: string[]; medium: string[]; low: string[] };
};

const DOMAIN_LIKE = /^(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:[/:?#].*)?$/i;
const NUMBER_LIKE = /^\+?[\d\s().-]{7,20}$/;

export function normaliseDomain(value: string): string | null {
  const match = DOMAIN_LIKE.exec(value.trim());
  if (!match) return null;
  return match[1].toLowerCase().replace(/^www\./, "");
}

function tldOf(host: string): string {
  const parts = host.split(".");
  return parts[parts.length - 1] ?? "";
}

function tldRisk(host: string): "high" | "medium" | "low" | undefined {
  if (!FACTS.tld_risk.verified) return undefined;
  const tld = tldOf(host);
  if (FACTS.tld_risk.high.includes(tld)) return "high";
  if (FACTS.tld_risk.medium.includes(tld)) return "medium";
  if (FACTS.tld_risk.low.includes(tld)) return "low";
  return undefined;
}

export function operatorOf(digits: string): JordanLayer["operator"] {
  const local = digits.startsWith("00962")
    ? `0${digits.slice(5)}`
    : digits.startsWith("962")
      ? `0${digits.slice(3)}`
      : digits;

  if (!local.startsWith("0")) return local.length > 8 ? "foreign" : undefined;
  if (/^0(?:2|3|5|6)\d{7}$/.test(local)) return "landline";
  if (/^07\d{8}$/.test(local)) {
    // Which network owns a prefix is a published fact this repo has not
    // sourced yet, so until it is verified the screen says so.
    if (!FACTS.operator_prefixes.verified) return "unknown";
    const mapped = FACTS.operator_prefixes.map[local.slice(1, 3)];
    return (mapped as JordanLayer["operator"]) ?? "unknown";
  }
  return "foreign";
}

/** How often this exact string has turned up in reported message text. */
async function reportHistory(
  db: D1Database,
  needle: string,
): Promise<{ reports_count: number; last_reported_at?: string }> {
  const row = await db
    .prepare(
      `SELECT COUNT(*) AS n, MAX(created_at) AS last
         FROM reports
        WHERE is_test = 0 AND message_text IS NOT NULL
          AND lower(message_text) LIKE '%' || lower(?) || '%'`,
    )
    .bind(needle)
    .first<{ n: number; last: string | null }>();

  const count = row?.n ?? 0;
  return count > 0 && row?.last
    ? { reports_count: count, last_reported_at: row.last }
    : { reports_count: count };
}

export async function lookup(db: D1Database, rawQuery: string): Promise<LookupResponse> {
  const query = rawQuery.trim().slice(0, 200);
  const host = normaliseDomain(query);

  if (host) {
    const layer: JordanLayer = {
      tld: tldOf(host),
      // No WHOIS and no threat-list call from this Worker. Null is the value
      // the screen renders as "could not be checked".
      domain_age_days: null,
      urlhaus_listed: null,
      ...(await reportHistory(db, host)),
    };
    const risk = tldRisk(host);
    if (risk) layer.tld_risk = risk;

    const registrable = registrableName(host);
    const official = ENTITIES.find(
      (entry) => entry.domain === host || registrableName(entry.domain) === registrable,
    );
    if (official) {
      layer.official_match = { name_ar: official.name_ar, name_en: official.name_en };
      return { query, kind: "domain", hint: "official", jordan_layer: layer };
    }

    const campaign = CAMPAIGNS.find((entry) => entry.domain && entry.domain.toLowerCase() === host);
    if (campaign) {
      layer.campaign_id = campaign.id;
      if (campaign.official_domain) {
        const impersonated = ENTITIES.find((entry) => entry.domain === campaign.official_domain);
        if (impersonated) {
          layer.claimed_entity_mismatch = {
            entity_id: impersonated.id,
            official_domain: campaign.official_domain,
          };
        }
      }
      return { query, kind: "domain", hint: "known_scam", jordan_layer: layer };
    }

    const hint: LookupHint =
      layer.tld_risk === "high" || (layer.reports_count ?? 0) > 0 ? "suspicious" : "unknown";
    return { query, kind: "domain", hint, jordan_layer: layer };
  }

  const digits = query.replace(/[\s().-]/g, "").replace(/^\+/, "");
  if (NUMBER_LIKE.test(query) && /^\d{7,}$/.test(digits)) {
    const layer: JordanLayer = { ...(await reportHistory(db, digits)) };
    const operator = operatorOf(digits);
    if (operator) layer.operator = operator;
    return {
      query,
      kind: "number",
      hint: (layer.reports_count ?? 0) > 0 ? "suspicious" : "unknown",
      jordan_layer: layer,
    };
  }

  // A CliQ alias or anything else typed in: all that can honestly be said is
  // whether anyone has reported it.
  if (query.length >= 3) {
    const layer: JordanLayer = { ...(await reportHistory(db, query)) };
    return {
      query,
      kind: "alias",
      hint: (layer.reports_count ?? 0) > 0 ? "suspicious" : "unknown",
      jordan_layer: layer,
    };
  }

  return { query, kind: "unknown", hint: "unknown", jordan_layer: {} };
}
