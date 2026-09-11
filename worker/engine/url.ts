/**
 * Deterministic URL inspection. Runs before the model is asked anything, and
 * never leaves the Worker: no fetch, no redirect following, no reputation
 * service. Everything here is derived from the string the user pasted.
 *
 * These are signals, not proof. One suspicious word does not make a domain
 * malicious, and the caller is expected to weigh them alongside the message.
 */

export type UrlSignalCode =
  | "not_https"
  | "ip_hostname"
  | "punycode_hostname"
  | "many_subdomains"
  | "long_hostname"
  | "suspicious_words"
  | "brand_plus_suspicious_word"
  | "claimed_government_non_gov_jo";

export interface UrlFacts {
  url: string;
  hostname: string;
  protocol: string;
  https: boolean;
  /** Best-effort registrable name. Approximate: no public suffix list here. */
  registrable: string;
  labels: string[];
  signals: UrlSignalCode[];
}

/** Words that show up in look-alike hostnames far more than in real ones. */
const SUSPICIOUS_WORDS = [
  "secure",
  "verify",
  "verification",
  "update",
  "login",
  "signin",
  "payment",
  "pay",
  "support",
  "account",
  "confirm",
  "recover",
  "unlock",
];

/**
 * Second-level labels that behave like suffixes, so `x.gov.jo` reads as one
 * name rather than a subdomain of `gov.jo`.
 */
const SUFFIX_SLDS = new Set(["gov", "com", "net", "org", "edu", "mil", "co"]);

const URL_IN_TEXT =
  /\b(?:https?:\/\/|www\.)[^\s<>"'()[\]{}،؛؟«»]+|(?:^|\s)((?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,})(?=[\s،؛.!?]|$)/gi;

/** Every URL-looking token in the text, in the order they appear. */
export function extractUrls(text: string): string[] {
  const found: string[] = [];
  for (const match of text.matchAll(URL_IN_TEXT)) {
    const raw = (match[0] ?? "").trim().replace(/[.,;:!?،؛؟»)\]]+$/u, "");
    if (raw) found.push(raw);
  }
  return [...new Set(found)];
}

function isIpv4(host: string): boolean {
  const parts = host.split(".");
  return (
    parts.length === 4 &&
    parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255)
  );
}

/** Approximate registrable name: the last label, plus the suffix-like ones. */
export function registrableName(hostname: string): string {
  const labels = hostname.split(".");
  if (labels.length <= 2) return hostname;
  const last = labels[labels.length - 1]!;
  const secondLast = labels[labels.length - 2]!;
  if (last.length === 2 && SUFFIX_SLDS.has(secondLast)) {
    return labels.slice(-3).join(".");
  }
  return labels.slice(-2).join(".");
}

/** Jordanian government sites live under .gov.jo. Nothing else does. */
export function isJordanGovernmentHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "gov.jo" || host.endsWith(".gov.jo");
}

export function inspectUrl(raw: string): UrlFacts | null {
  const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(raw) ? raw : `http://${raw}`;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || !hostname.includes(".")) {
    if (!isIpv4(hostname)) return null;
  }

  const labels = hostname.split(".");
  const registrable = registrableName(hostname);
  const signals: UrlSignalCode[] = [];

  // The scheme is only a signal when the user actually wrote one.
  if (/^https?:\/\//i.test(raw) && parsed.protocol !== "https:") signals.push("not_https");
  if (isIpv4(hostname) || hostname.includes(":")) signals.push("ip_hostname");
  if (labels.some((l) => l.startsWith("xn--"))) signals.push("punycode_hostname");
  if (labels.length >= 5) signals.push("many_subdomains");
  if (hostname.length >= 30) signals.push("long_hostname");

  const words = SUSPICIOUS_WORDS.filter((w) => hostname.includes(w));
  if (words.length > 0) signals.push("suspicious_words");

  // A brand name sitting beside a suspicious word, in a hostname whose
  // registrable part is something else, is the shape of a look-alike.
  const outsideRegistrable = hostname.slice(0, Math.max(0, hostname.length - registrable.length));
  if (words.length > 0 && outsideRegistrable.length > 0 && /[a-z]{3,}-|-[a-z]{3,}/.test(hostname)) {
    signals.push("brand_plus_suspicious_word");
  }

  return {
    url: raw,
    hostname,
    protocol: parsed.protocol.replace(":", ""),
    https: parsed.protocol === "https:",
    registrable,
    labels,
    signals: [...new Set(signals)],
  };
}

/**
 * The URL worth telling the user about: the one carrying the most signals,
 * and on a tie the first one written.
 */
export function inspectText(text: string): UrlFacts | null {
  const inspected = extractUrls(text)
    .map(inspectUrl)
    .filter((f): f is UrlFacts => f !== null);
  if (inspected.length === 0) return null;
  return inspected.reduce((best, f) => (f.signals.length > best.signals.length ? f : best));
}

/**
 * Applied after the model has said who the message claims to be from. A
 * message claiming a Jordanian government body while linking somewhere that is
 * not .gov.jo is a strong impersonation signal — but a bank, telecom, courier
 * or university linking to its own domain is perfectly normal, so this only
 * fires on a government claim.
 */
export function governmentImpersonationSignal(
  facts: UrlFacts,
  category: string,
): UrlSignalCode | null {
  if (category !== "impersonation_government") return null;
  if (isJordanGovernmentHost(facts.hostname)) return null;
  return "claimed_government_non_gov_jo";
}
