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

/** What the interaction is ultimately trying to achieve. */
export type AttackGoal =
  | "steal_credentials"
  | "steal_otp"
  | "obtain_payment"
  | "obtain_personal_data"
  | "account_takeover"
  | "extortion"
  | "install_malware"
  | "redirect_to_fake_service"
  | "unknown"
  | "none";

export const ATTACK_GOALS: AttackGoal[] = [
  "steal_credentials",
  "steal_otp",
  "obtain_payment",
  "obtain_personal_data",
  "account_takeover",
  "extortion",
  "install_malware",
  "redirect_to_fake_service",
  "unknown",
  "none",
];

/** How the sender pushes the reader into acting. */
export type PressureMethod =
  | "urgency"
  | "fear"
  | "authority"
  | "secrecy"
  | "reward"
  | "scarcity"
  | "social_pressure";

export const PRESSURE_METHODS: PressureMethod[] = [
  "urgency",
  "fear",
  "authority",
  "secrecy",
  "reward",
  "scarcity",
  "social_pressure",
];

/**
 * Something the engine could actually see in a screenshot. Takes the place of
 * character offsets when there is no pasted text to offset into.
 */
export interface EvidenceItem {
  type: string;
  value: string;
  why: string;
}

/** Deterministic facts about a link in the input. Codes, translated client-side. */
export interface UrlAnalysis {
  url: string;
  hostname: string;
  signals: string[];
}

/** A documented pattern this case resembles. Never "the same scam". */
export interface KnownThreatMatch {
  pattern_id: string;
  title_ar: string;
  title_en: string;
  confidence: "strong";
  matched_signals: string[];
  source_name?: string;
}

/** A red flag that survived post-validation: its quote is present in the input. */
export interface RedFlag {
  quote: string;
  why: string;
  /** Offsets into the original, unmodified message text. */
  start: number;
  end: number;
}

/** A screenshot the user chose. Held in memory for one request and no longer. */
export interface AnalyzeImage {
  media_type: "image/jpeg" | "image/png" | "image/webp";
  /** Base64, no data: prefix. */
  data: string;
}

/**
 * What the person says they are looking at. A hint for the engine only — it
 * still decides for itself, and nothing in post-validation keys off this.
 * Distinct from `channel`, which is how the thing reached them.
 */
export type AnalysisType = "message" | "link" | "call" | "job";

export const ANALYSIS_TYPES: AnalysisType[] = ["message", "link", "call", "job"];

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Conservative: comfortably inside both the Worker and the API's limits. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

/** Sonnet 5 reads images up to this on the long edge; larger is downscaled. */
export const MAX_IMAGE_EDGE = 2576;

export interface AnalyzeRequest {
  text: string;
  lang: Lang;
  channel?: Channel;
  image?: AnalyzeImage;
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
  /** Structured breakdown of what is being attempted. */
  attack_goal: AttackGoal;
  requested_action: string | null;
  pressure_methods: PressureMethod[];
  /** Screenshots only: what the engine could actually read, and what it saw. */
  /**
   * True when the engine could not be reached and the result came from the
   * local heuristics instead. The screen must say so; this is never a full
   * analysis and is never cached.
   */
  preliminary?: boolean;
  /** Which local signals produced a preliminary result, for the wording. */
  preliminary_signals?: string[];
  /** What the OCR step read off the screenshot. The verdict reasons over this. */
  extracted_text?: string;
  /**
   * Which provider read the image, and how long it took. Present only for a
   * screenshot. A fallback is visible here rather than silent — but the UI
   * names no vendor, so this is for the eval and the comparison table.
   */
  ocr?: {
    provider: string;
    lang: Lang;
    ms: number;
    usage?: { input_tokens: number; output_tokens: number };
  };
  /** Tokens the call consumed. No vendor name, just the counts. */
  usage?: { input_tokens: number; output_tokens: number };
  evidence_items?: EvidenceItem[];
  url_analysis?: UrlAnalysis;
  known_threat_match?: KnownThreatMatch;
  /** Facts about the domain or number inside the message. See worker/routes/lookup.ts. */
  jordan_layer?: {
    subject: string;
    kind: "domain" | "number" | "alias" | "unknown";
    layer: Record<string, unknown>;
  };
  input_kind: "text" | "image";
  model: string;
  latency_ms: number;
  /** Set when the result came from src/demo/cached-verdicts.json, never from the API. */
  cached?: true;
}

export interface ApiError {
  error:
    | "timeout"
    | "too_long"
    | "rate_limited"
    | "bad_request"
    | "server_error"
    /** The configured model is wrong, unavailable, or refuses this request shape. */
    | "model_unavailable";
  message?: string;
}

export const MAX_INPUT_CHARS = 2000;

export type ReportSource = "detect" | "shield";

/** The Report screen's threat chips. */
export type ThreatType =
  | "phishing"
  | "financial_scam"
  | "fake_job"
  | "cyber_extortion"
  | "account_takeover"
  | "other";

export const THREAT_TYPES: ThreatType[] = [
  "phishing",
  "financial_scam",
  "fake_job",
  "cyber_extortion",
  "account_takeover",
  "other",
];

/**
 * Recorded for the reporter's own reference. DARA' does not contact anyone,
 * and no screen may say otherwise.
 */
export type RelevantAuthority = "cybercrime_unit" | "tra" | "bank_fraud" | "other";

export const RELEVANT_AUTHORITIES: RelevantAuthority[] = [
  "cybercrime_unit",
  "tra",
  "bank_fraud",
  "other",
];

export interface ReportRequest {
  source: ReportSource;
  category: Category;
  verdict?: Verdict;
  confidence?: number;
  impersonated_entity?: string | null;
  channel?: Channel;
  message_text?: string;
  is_test?: boolean;
  threat_type?: ThreatType;
  relevant_authority?: RelevantAuthority;
  /** Defaults to true. When true, `contact` is dropped rather than stored. */
  anonymous?: boolean;
  contact?: string;
  /** What the person says happened, in their own words. */
  description?: string;
}

/** One row of the Community Reports feed. Never carries contact details. */
export interface CommunityReport {
  case_number: string;
  threat_type: ThreatType;
  description: string;
  /** True for the rows the team seeded. The feed marks them as examples. */
  is_seed: boolean;
}

export interface ReportResponse {
  case_number: string;
  status: string;
}
