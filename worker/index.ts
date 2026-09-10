import { Hono } from "hono";
import {
  CATEGORIES,
  CHANNELS,
  MAX_INPUT_CHARS,
  type AnalyzeResponse,
  type Category,
  type Channel,
  type Lang,
  type ReportResponse,
} from "../shared/types";
import {
  EngineFailure,
  EngineRateLimited,
  EngineTimeout,
  runEngine,
} from "./engine/analyze";
import { allowRequest, type RateLimitBinding } from "./lib/ratelimit";
import { caseNumberFor, idFromCaseNumber } from "./lib/reports";

export interface Env {
  DB: D1Database;
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  ENGINE_THINKING?: string;
  APP_ENV?: string;
  ANALYZE_LIMITER?: RateLimitBinding;
}

const DEFAULT_MODEL = "claude-sonnet-5";

/**
 * The eval compares the two candidate models against one deployment, so
 * /api/analyze accepts a model override — but only one of these two. Any other
 * value is ignored and the configured model is used.
 */
const MODEL_ALLOWLIST = new Set([
  "claude-sonnet-5",
  "claude-haiku-4-5",
  "claude-haiku-4-5-20251001",
]);

function chosenModel(configured: string, requested: string | undefined): string {
  return requested && MODEL_ALLOWLIST.has(requested) ? requested : configured;
}

const app = new Hono<{ Bindings: Env }>();

/**
 * Nothing under /api is cacheable. Without this a browser is free to reuse a
 * GET /api/health heuristically, which is how you end up staring at a stale
 * key_present:false minutes after adding the secret.
 */
app.use("/api/*", async (c, next) => {
  await next();
  c.header("Cache-Control", "no-store");
});

app.get("/api/health", async (c) => {
  // A deploy does not run migrations, so a Worker can be perfectly healthy and
  // still have no reports table. Health has to say so, or the first report of
  // the demo is the thing that finds out.
  let db_ready = false;
  try {
    await c.env.DB.prepare("SELECT 1 FROM reports LIMIT 1").first();
    db_ready = true;
  } catch {
    db_ready = false;
  }

  return c.json({
    ok: true,
    // Presence only. The key itself is never read into a response or a log.
    key_present: Boolean(c.env.ANTHROPIC_API_KEY),
    db_ready,
    model: c.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
  });
});

app.post("/api/analyze", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }

  const payload = body as { text?: unknown; lang?: unknown; channel?: unknown };
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const lang: Lang = payload.lang === "en" ? "en" : "ar";
  const channel =
    typeof payload.channel === "string" && CHANNELS.includes(payload.channel as Channel)
      ? (payload.channel as Channel)
      : undefined;

  if (text.length === 0) return c.json({ error: "bad_request" }, 400);
  if (text.length > MAX_INPUT_CHARS) return c.json({ error: "too_long" }, 413);

  if (!(await allowRequest(c.req.raw, c.env.ANALYZE_LIMITER))) {
    return c.json({ error: "rate_limited" }, 429);
  }

  // Checked after validation so a too-long paste still gets its own message.
  const apiKey = c.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return c.json({ error: "server_error", message: "engine not configured" }, 503);
  }

  try {
    const result = await runEngine({
      apiKey,
      model: chosenModel(
        c.env.ANTHROPIC_MODEL ?? DEFAULT_MODEL,
        c.req.header("X-DARA-Model"),
      ),
      thinking: c.env.ENGINE_THINKING,
      text,
      lang,
      channel,
    });

    const response: AnalyzeResponse & { stats?: unknown } = {
      verdict: result.verdict,
      confidence: result.confidence,
      category: result.category,
      impersonated_entity: result.impersonated_entity,
      headline: result.headline,
      red_flags: result.red_flags,
      actions: result.actions,
      report_recommended: result.report_recommended,
      route_to_shield: result.route_to_shield,
      model: result.model,
      latency_ms: result.latency_ms,
    };
    // The eval reads the filter counters; the app ignores them.
    response.stats = result.stats;
    return c.json(response);
  } catch (error) {
    if (error instanceof EngineTimeout) return c.json({ error: "timeout" }, 504);
    if (error instanceof EngineRateLimited) return c.json({ error: "rate_limited" }, 429);
    if (error instanceof EngineFailure) {
      console.error("analyze failed:", error.message);
      return c.json({ error: "server_error" }, 502);
    }
    // Post-validation rejected the output. The message text is never logged.
    console.error("analyze rejected the engine output");
    return c.json({ error: "server_error" }, 502);
  }
});

app.post("/api/report", async (c) => {
  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }

  const payload = body as Record<string, unknown>;
  const source = payload.source === "shield" ? "shield" : "detect";
  const category = CATEGORIES.includes(payload.category as Category)
    ? (payload.category as Category)
    : "other";
  const verdict =
    payload.verdict === "scam" ||
    payload.verdict === "suspicious" ||
    payload.verdict === "likely_safe"
      ? payload.verdict
      : null;
  const confidence =
    typeof payload.confidence === "number" && Number.isFinite(payload.confidence)
      ? Math.min(100, Math.max(0, Math.round(payload.confidence)))
      : null;
  const entity =
    typeof payload.impersonated_entity === "string" && payload.impersonated_entity.trim()
      ? payload.impersonated_entity.trim().slice(0, 200)
      : null;
  const channel = CHANNELS.includes(payload.channel as Channel)
    ? (payload.channel as Channel)
    : null;
  const messageText =
    typeof payload.message_text === "string" && payload.message_text.trim()
      ? payload.message_text.trim().slice(0, MAX_INPUT_CHARS)
      : null;
  const isTest = payload.is_test === true ? 1 : 0;

  try {
    // No IP, user agent or device column exists to write to. See migrations/.
    const row = await c.env.DB.prepare(
      `INSERT INTO reports
         (source, category, verdict, confidence, impersonated_entity, channel, message_text, is_test)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, status`,
    )
      .bind(source, category, verdict, confidence, entity, channel, messageText, isTest)
      .first<{ id: number; status: string }>();

    if (!row) return c.json({ error: "server_error" }, 500);

    const response: ReportResponse = {
      case_number: caseNumberFor(row.id),
      status: row.status,
    };
    return c.json(response, 201);
  } catch (error) {
    console.error("report insert failed:", (error as Error).message);
    return c.json({ error: "server_error" }, 500);
  }
});

app.get("/api/report/:case_number", async (c) => {
  const id = idFromCaseNumber(c.req.param("case_number"));
  if (id === null) return c.json({ error: "bad_request" }, 400);

  let row: { status: string } | null;
  try {
    row = await c.env.DB.prepare(`SELECT status FROM reports WHERE id = ?`)
      .bind(id)
      .first<{ status: string }>();
  } catch (error) {
    // Without this, a D1 error escapes to Hono's default handler and answers
    // text/plain, breaking the JSON error shape every other route keeps.
    console.error("report lookup failed:", (error as Error).message);
    return c.json({ error: "server_error" }, 500);
  }

  if (!row) return c.json({ error: "not_found" }, 404);
  // Status only — the report's contents are never read back over the API.
  return c.json({ status: row.status });
});

// The bare path too: "/api/*" does not match "/api", which would otherwise
// fall through to the asset server and answer with the app's index.html.
app.all("/api", (c) => c.json({ error: "not_found" }, 404));
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

export default app;
