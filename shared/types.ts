/** Shared between the Worker and the app. Keep both sides honest. */

export type Verdict = "scam" | "suspicious" | "likely_safe";

export type Lang = "ar" | "en";

export type Channel = "sms" | "whatsapp" | "call" | "email" | "social" | "other";

export const CHANNELS: Channel[] = [
  "sms",
  "whatsapp",
  "call",
  "email",
  "social",
  "other",
];

export type Category =
  | "impersonation_government"
  | "impersonation_bank"
  | "impersonation_telecom"
  | "phishing_link"
  | "otp_theft"
  | "fake_prize"
  | "fake_job"
  | "fake_shop"
  | "investment"
  | "parcel_customs"
  | "traffic_fine"
  | "police_threat"
  | "extortion"
  | "other"
  | "none";

export const CATEGORIES: Category[] = [
  "impersonation_government",
  "impersonation_bank",
  "impersonation_telecom",
  "phishing_link",
  "otp_theft",
  "fake_prize",
  "fake_job",
  "fake_shop",
  "investment",
  "parcel_customs",
  "traffic_fine",
  "police_threat",
  "extortion",
  "other",
  "none",
];

/** A red flag that survived post-validation: its quote is present in the input. */
export interface RedFlag {
  quote: string;
  why: string;
  /** Offsets into the original, unmodified message text. */
  start: number;
  end: number;
}

export interface AnalyzeRequest {
  text: string;
  lang: Lang;
  channel?: Channel;
}

export interface AnalyzeResponse {
  verdict: Verdict;
  confidence: number;
  category: Category;
  impersonated_entity: string | null;
  headline: string;
  red_flags: RedFlag[];
  actions: string[];
  report_recommended: boolean;
  route_to_shield: boolean;
  model: string;
  latency_ms: number;
  /** Set when the result came from src/demo/cached-verdicts.json, never from the API. */
  cached?: true;
}

export interface ApiError {
  error: "timeout" | "too_long" | "rate_limited" | "bad_request" | "server_error";
  message?: string;
}

export const MAX_INPUT_CHARS = 2000;

export type ReportSource = "detect" | "shield";

export interface ReportRequest {
  source: ReportSource;
  category: Category;
  verdict?: Verdict;
  confidence?: number;
  impersonated_entity?: string | null;
  channel?: Channel;
  message_text?: string;
  is_test?: boolean;
}

export interface ReportResponse {
  case_number: string;
  status: string;
}
