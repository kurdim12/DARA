import file from "../../content/threats.json";
import type { Lang } from "../../shared/types";

export interface Threat {
  id: string;
  category: string;
  channel: "sms" | "whatsapp" | "call";
  title: { en: string; ar: string };
  description: { en: string; ar: string };
}

export function allThreats(): Threat[] {
  return file.threats as Threat[];
}

export function pick(text: { en: string; ar: string }, lang: Lang): string {
  return lang === "ar" ? text.ar : text.en;
}

/**
 * How many reports have been filed on DARA' per category. An aggregate from
 * D1 and nothing else — no statistic, no third-party database, no estimate.
 * A category with no reports yet simply has no entry, and the UI says
 * "Known pattern" instead of showing a number.
 */
export async function reportCounts(): Promise<Record<string, number>> {
  try {
    const res = await fetch("/api/threats");
    if (!res.ok) return {};
    const body = (await res.json()) as { counts?: Record<string, number> };
    return body.counts ?? {};
  } catch {
    return {};
  }
}
