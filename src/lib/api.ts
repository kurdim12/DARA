import type {
  AnalysisType,
  AnalyzeImage,
  AnalyzeResponse,
  Channel,
  Lang,
  ReportRequest,
  ReportResponse,
} from "../../shared/types";
import { cachedVerdictFor, rememberVerdict } from "./demo";
import type { TextKey } from "../i18n";

/** A live check that takes longer than this falls back to a saved result. */
const SLOW_MS = 12_000;

export class AppError extends Error {
  constructor(readonly key: TextKey) {
    super(key);
  }
}

function errorKeyForStatus(status: number, code?: string): TextKey {
  if (status === 504 || code === "timeout") return "error.timeout";
  if (status === 413 || code === "too_long") return "error.too_long";
  if (status === 429 || code === "rate_limited") return "error.rate_limited";
  if (status === 415 || code === "bad_image") return "error.bad_image";
  if (code === "image_too_large") return "error.image_too_large";
  return "error.generic";
}

async function postAnalyze(
  text: string,
  lang: Lang,
  channel: Channel | undefined,
  signal: AbortSignal,
  image?: AnalyzeImage,
  type?: AnalysisType,
): Promise<AnalyzeResponse> {
  const res = await fetch("/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text, lang, channel, type, image }),
    signal,
  });

  if (!res.ok) {
    let code: string | undefined;
    try {
      code = ((await res.json()) as { error?: string }).error;
    } catch {
      code = undefined;
    }
    throw new AppError(errorKeyForStatus(res.status, code));
  }

  return (await res.json()) as AnalyzeResponse;
}

/**
 * Runs the live check. A staged message falls back to its saved verdict when
 * the device is offline, the request fails, or it passes the slow mark — and
 * the screen says so. Anything else surfaces the error.
 */
export async function analyze(
  text: string,
  lang: Lang,
  channel?: Channel,
  image?: AnalyzeImage,
  type?: AnalysisType,
): Promise<AnalyzeResponse> {
  // A screenshot has no saved verdict behind it and takes longer to read, so
  // it goes straight through with no race against the slow mark.
  if (image) {
    const controller = new AbortController();
    try {
      return await postAnalyze(text, lang, channel, controller.signal, image, type);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        typeof navigator !== "undefined" && navigator.onLine === false
          ? "error.offline"
          : "error.generic",
      );
    }
  }

  const fallback = cachedVerdictFor(text, lang);

  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    if (fallback) return fallback;
    throw new AppError("error.offline");
  }

  const controller = new AbortController();
  const live = postAnalyze(text, lang, channel, controller.signal, undefined, type).then((value) => {
    // A staged message that has just been checked live leaves its verdict on
    // this device, so the same message survives a bad network later. Nothing
    // a person pastes themselves is ever written down — see rememberVerdict.
    rememberVerdict(text, lang, value);
    return value;
  });

  if (!fallback) {
    try {
      return await live;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("error.generic");
    }
  }

  let slowTimer: ReturnType<typeof setTimeout> | undefined;
  const slow = new Promise<"slow">((resolve) => {
    slowTimer = setTimeout(() => resolve("slow"), SLOW_MS);
  });

  try {
    const outcome = await Promise.race([
      live.then((value) => ({ ok: true as const, value })).catch(() => ({ ok: false as const })),
      slow,
    ]);
    if (outcome === "slow" || outcome.ok === false) {
      controller.abort();
      return fallback;
    }
    return outcome.value;
  } finally {
    if (slowTimer) clearTimeout(slowTimer);
  }
}

export async function sendReport(payload: ReportRequest): Promise<ReportResponse> {
  const res = await fetch("/api/report", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new AppError("error.generic");
  return (await res.json()) as ReportResponse;
}

export interface RadarRow {
  key: string;
  count: number;
}

export interface RadarData {
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

/** The radar's numbers. Every one is a count of rows in D1; see worker/routes/radar.ts. */
export async function fetchRadar(): Promise<RadarData> {
  let res: Response;
  try {
    res = await fetch("/api/radar");
  } catch {
    throw new AppError(
      typeof navigator !== "undefined" && navigator.onLine === false
        ? "error.offline"
        : "radar.error",
    );
  }
  if (!res.ok) throw new AppError("radar.error");
  return (await res.json()) as RadarData;
}
