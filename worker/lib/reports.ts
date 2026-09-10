/**
 * The case number is derived from the row id, never stored — so there is one
 * source of truth and nothing to keep in step.
 */
const CASE_PREFIX = "DR-2026-";

export function caseNumberFor(id: number): string {
  return `${CASE_PREFIX}${String(id).padStart(5, "0")}`;
}

export function idFromCaseNumber(caseNumber: string): number | null {
  const match = /^DR-2026-(\d{1,9})$/.exec(caseNumber.trim().toUpperCase());
  if (!match) return null;
  const id = Number.parseInt(match[1]!, 10);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}
