import { AlertTriangle, Check, HelpCircle } from "lucide-react";
import { useI18n, type TextKey } from "../i18n";
import type { JordanLayer as Layer } from "../lib/api";
import { entities } from "../lib/entities";
import { campaigns } from "../lib/campaigns";

type Tone = "confirmed" | "warning" | "unknown";

interface Row {
  id: string;
  tone: Tone;
  text: string;
  values: { text: string; code?: boolean }[];
}

const TLD_ROW: Record<"high" | "medium" | "low", { key: TextKey; tone: Tone }> = {
  high: { key: "jl.tld_high", tone: "warning" },
  medium: { key: "jl.tld_medium", tone: "warning" },
  low: { key: "jl.tld_low", tone: "confirmed" },
};

const OPERATOR_ROW: Record<string, { key: TextKey; tone: Tone }> = {
  zain: { key: "jl.op_zain", tone: "confirmed" },
  orange: { key: "jl.op_orange", tone: "confirmed" },
  umniah: { key: "jl.op_umniah", tone: "confirmed" },
  landline: { key: "jl.op_landline", tone: "confirmed" },
  foreign: { key: "jl.op_foreign", tone: "warning" },
  unknown: { key: "jl.op_unknown", tone: "unknown" },
};

/**
 * Facts about a domain or a number, each one either confirmed, a warning, or
 * openly not checked. The footer says what the whole block is: facts, not a
 * verdict — and "could not be checked" is a row, not an omission, because a
 * missing row reads as a clean bill of health.
 */
export function JordanLayerRows({ layer }: { layer: Layer }) {
  const { t, lang } = useI18n();
  const rows: Row[] = [];

  if (layer.official_match) {
    rows.push({
      id: "official",
      tone: "confirmed",
      text: t("jl.official"),
      values: [{ text: lang === "ar" ? layer.official_match.name_ar : layer.official_match.name_en }],
    });
  }

  if (layer.claimed_entity_mismatch) {
    const mismatch = layer.claimed_entity_mismatch;
    const named = entities(lang).find((entry) => entry.id === mismatch.entity_id);
    rows.push({
      id: "mismatch",
      tone: "warning",
      text: t("jl.mismatch"),
      values: [
        { text: named?.name ?? mismatch.entity_id },
        { text: mismatch.official_domain, code: true },
      ],
    });
  }

  if (layer.domain_age_days !== undefined) {
    rows.push(
      layer.domain_age_days === null
        ? { id: "age", tone: "unknown", text: t("jl.age_unknown"), values: [] }
        : {
            id: "age",
            tone: layer.domain_age_days < 60 ? "warning" : "confirmed",
            text: t("jl.age"),
            values: [{ text: String(layer.domain_age_days), code: true }],
          },
    );
  }

  if (layer.urlhaus_listed !== undefined) {
    rows.push(
      layer.urlhaus_listed === null
        ? { id: "urlhaus", tone: "unknown", text: t("jl.urlhaus_unknown"), values: [] }
        : {
            id: "urlhaus",
            tone: layer.urlhaus_listed ? "warning" : "confirmed",
            text: t(layer.urlhaus_listed ? "jl.urlhaus_listed" : "jl.urlhaus_clear"),
            values: [],
          },
    );
  }

  if (layer.tld_risk) {
    const row = TLD_ROW[layer.tld_risk];
    const tld = layer.tld ?? "";
    rows.push({
      id: "tld",
      tone: row.tone,
      text: t(row.key),
      values: [{ text: tld.startsWith(".") ? tld : `.${tld}`, code: true }],
    });
  }

  if (layer.reports_count !== undefined) {
    if (layer.reports_count === 0) {
      rows.push({ id: "reports", tone: "confirmed", text: t("jl.reports_none"), values: [] });
    } else if (layer.last_reported_at) {
      rows.push({
        id: "reports",
        tone: "warning",
        text: t("jl.reports"),
        values: [
          { text: String(layer.reports_count), code: true },
          { text: layer.last_reported_at.slice(0, 10), code: true },
        ],
      });
    } else {
      rows.push({
        id: "reports",
        tone: "warning",
        text: t("jl.reports_no_date"),
        values: [{ text: String(layer.reports_count), code: true }],
      });
    }
  }

  if (layer.campaign_id) {
    const named = campaigns(lang).find((entry) => entry.id === layer.campaign_id);
    rows.push({
      id: "campaign",
      tone: "warning",
      text: t(named ? "jl.campaign" : "jl.campaign_generic"),
      values: named ? [{ text: named.title }] : [],
    });
  }

  if (layer.operator) {
    const row = OPERATOR_ROW[layer.operator] ?? OPERATOR_ROW.unknown;
    rows.push({ id: "operator", tone: row.tone, text: t(row.key), values: [] });
  }

  if (rows.length === 0) return <p className="t-sub">{t("jl.empty")}</p>;

  return (
    <>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.id} className="flex items-start gap-2.5">
            <Mark tone={row.tone} />
            <span dir="auto" className="t-body flex-1 text-[14px]">
              {fill(row.text, row.values)}
            </span>
          </li>
        ))}
      </ul>
      <p className="t-sub mt-2.5 border-t border-line pt-2 text-[12px]">{t("jl.footer")}</p>
    </>
  );
}

/** Puts {0}, {1} … back into a sentence, code values in a bdi so they stay LTR. */
function fill(text: string, values: { text: string; code?: boolean }[]) {
  const parts = text.split(/(\{\d+\})/g);
  return parts.map((part, index) => {
    const match = /^\{(\d+)\}$/.exec(part);
    if (!match) return <span key={index}>{part}</span>;
    const value = values[Number(match[1])];
    if (!value) return null;
    return value.code ? (
      <bdi key={index} dir="ltr" className="break-all font-semibold">
        {value.text}
      </bdi>
    ) : (
      <bdi key={index} className="font-semibold">
        {value.text}
      </bdi>
    );
  });
}

function Mark({ tone }: { tone: Tone }) {
  const shared = "mt-0.5 shrink-0";
  if (tone === "confirmed")
    return <Check size={16} strokeWidth={1.75} aria-hidden="true" className={`${shared} text-green`} />;
  if (tone === "warning")
    return (
      <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" className={`${shared} text-red-ink`} />
    );
  return <HelpCircle size={16} strokeWidth={1.75} aria-hidden="true" className={`${shared} text-ink-2`} />;
}
