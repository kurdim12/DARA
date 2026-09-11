/**
 * Case numbers and the rehearsal flag live on this device only. Nothing here
 * is sent anywhere; clearing the browser's storage loses it.
 */
const CASES_KEY = "dara.cases";
const TEST_MODE_KEY = "dara.testMode";

export interface StoredCase {
  case_number: string;
  saved_at: string;
  /** What the server said when the report was sent. May be out of date. */
  status?: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage can be unavailable; the case number is still on screen.
  }
}

export function listCases(): StoredCase[] {
  return read<StoredCase[]>(CASES_KEY, []);
}

export function rememberCase(caseNumber: string, status?: string): void {
  const next = [
    { case_number: caseNumber, saved_at: new Date().toISOString(), status },
    ...listCases().filter((c) => c.case_number !== caseNumber),
  ].slice(0, 20);
  write(CASES_KEY, next);
}

export function clearLocalHistory(): void {
  try {
    localStorage.removeItem(CASES_KEY);
    localStorage.removeItem(TEST_MODE_KEY);
  } catch {
    // Nothing to do.
  }
}

export function isTestMode(): boolean {
  return read<boolean>(TEST_MODE_KEY, false) === true;
}

export function setTestMode(on: boolean): void {
  write(TEST_MODE_KEY, on);
}
