/**
 * Per-IP limiting for /api/analyze.
 *
 * The Workers rate-limiting binding is used when it is configured. Without it
 * the Worker falls back to a fixed window held in the isolate's memory: weaker
 * (each isolate counts on its own) but it needs no extra resource and cannot
 * fail the deploy. Either way the address is held in memory for the length of
 * one window and is never written to the database or to a log.
 */

export interface RateLimitBinding {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

const WINDOW_MS = 60_000;
const WINDOW_LIMIT = 30;

const hits = new Map<string, { count: number; resetAt: number }>();

function localLimit(key: string, now: number): boolean {
  const entry = hits.get(key);
  if (!entry || entry.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + WINDOW_MS });
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
    }
    return true;
  }
  entry.count += 1;
  return entry.count <= WINDOW_LIMIT;
}

export function clientKey(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function allowRequest(
  request: Request,
  binding: RateLimitBinding | undefined,
): Promise<boolean> {
  const key = clientKey(request);
  if (binding) {
    const { success } = await binding.limit({ key });
    return success;
  }
  return localLimit(key, Date.now());
}
