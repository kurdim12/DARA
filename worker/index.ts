import { Hono } from "hono";
import { radar } from "./routes/radar";
import { layerForText, lookup } from "./routes/lookup";
import {
  ALLOWED_IMAGE_TYPES,
  ANALYSIS_TYPES,
  CATEGORIES,
  CHANNELS,
  RELEVANT_AUTHORITIES,
  THREAT_TYPES,
  MAX_IMAGE_BYTES,
  MAX_INPUT_CHARS,
  type AnalysisType,
  type AnalyzeImage,
  type AnalyzeResponse,
  type Category,
  type Channel,
  type CommunityReport,
  type RelevantAuthority,
  type ThreatType,
  type Lang,
  type ReportResponse,
} from "../shared/types";
import {
  EngineFailure,
  EngineModelUnavailable,
  EngineRateLimited,
  EngineTimeout,
  runEngine,
} from "./engine/analyze";
import { governmentImpersonationSignal, inspectText, type UrlSignalCode } from "./engine/url";
import { matchVerifiedPattern, patternById } from "./engine/match";
import { allowRequest, type RateLimitBinding } from "./lib/ratelimit";
import { caseNumberFor, idFromCaseNumber } from "./lib/reports";

export interface Env {
  DB: D1Database;
  /**
   * The gateway key. Named for the gateway it is actually used against, not
   * for the wire format: this app talks the Messages API, but every call goes
   * to ANTHROPIC_BASE_URL — OpenRouter — and is billed there. The old name
   * read as "an Anthropic account is required", which is not true and cost a
   * real misunderstanding, so it is only kept as a fallback for a deployment
   * that still carries the old secret.
   */
  OPENROUTER_API_KEY?: string;
  /** @deprecated Set OPENROUTER_API_KEY. Read so an existing deploy keeps working. */
  ANTHROPIC_API_KEY?: string;
  ANTHROPIC_MODEL?: string;
  /** Comma-separated ids the eval may compare against the configured one. */
  ANTHROPIC_MODEL_CANDIDATES?: string;
  /** Comma-separated ids tried in order when the configured model fails fast. */
  ANTHROPIC_MODEL_FALLBACKS?: string;
  /**
   * A Messages-API gateway to call instead of Anthropic directly. OpenRouter's
   * is https://openrouter.ai/api. Unset means straight to Anthropic.
   */
  ANTHROPIC_BASE_URL?: string;
  ENGINE_THINKING?: string;
  APP_ENV?: string;
  ANALYZE_LIMITER?: RateLimitBinding;
}

const DEFAULT_MODEL = "claude-sonnet-5";

/** The gateway key under either name, new one first. */
const gatewayKey = (env: Env): string | undefined =>
  env.OPENROUTER_API_KEY || env.ANTHROPIC_API_KEY;

/**
 * The eval compares candidate models against one deployment, so /api/analyze
 * accepts a model override — but only the configured model or one of the
 * candidates named in `ANTHROPIC_MODEL_CANDIDATES`. Anything else is ignored
 * and the configured model is used, so the override can never become a way to
 * spend this account's credits on any model in a gateway's catalogue.
 *
 * The list is config rather than code because which models are worth trying
 * changes faster than this file does — and because a prefix match would not be
 * an allowlist: `anthropic/` accepts everything behind it.
 */
function allowedModels(env: Env): Set<string> {
  const configured = env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  const candidates = (env.ANTHROPIC_MODEL_CANDIDATES ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  return new Set([configured, ...candidates]);
}

function chosenModel(env: Env, requested: string | undefined): string {
  const configured = env.ANTHROPIC_MODEL ?? DEFAULT_MODEL;
  return requested && allowedModels(env).has(requested) ? requested : configured;
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

/**
 * The API answers two origins: itself, and the GitHub Pages build of the
 * reference app, which calls this Worker for every verdict it shows.
 *
 * An allowlist, not a wildcard, and no credentials: there is no cookie or
 * token to leak, and the rate limit still applies per IP whoever asks. An
 * origin that is not on the list gets the answer with no CORS header, which
 * is the same as being refused by a browser.
 */
const ALLOWED_ORIGINS = new Set(["https://zaidabualshaar.github.io"]);

app.use("/api/*", async (c, next) => {
  const origin = c.req.header("Origin");
  const allowed =
    origin && (ALLOWED_ORIGINS.has(origin) || origin === new URL(c.req.url).origin);

  if (allowed && c.req.method === "OPTIONS") {
    return c.body(null, 204, {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "content-type",
      "Access-Control-Max-Age": "86400",
      Vary: "Origin",
    });
  }

  await next();

  if (allowed) {
    c.header("Access-Control-Allow-Origin", origin);
    c.header("Vary", "Origin");
  }
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
    key_present: Boolean(gatewayKey(c.env)),
    // Which door the key opens. A key that is present but pointed at the wrong
    // gateway fails exactly like a missing one, and this is the only place to
    // see the difference from a phone.
    api_host: c.env.ANTHROPIC_BASE_URL ? new URL(c.env.ANTHROPIC_BASE_URL).host : "api.anthropic.com",
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

  const payload = body as {
    text?: unknown;
    lang?: unknown;
    channel?: unknown;
    type?: unknown;
    image?: unknown;
  };
  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const lang: Lang = payload.lang === "en" ? "en" : "ar";
  const channel =
    typeof payload.channel === "string" && CHANNELS.includes(payload.channel as Channel)
      ? (payload.channel as Channel)
      : undefined;
  // A hint from the Scan chips. Anything not on the list is dropped rather
  // than passed through: this string ends up inside the prompt.
  const analysisType =
    typeof payload.type === "string" &&
    (ANALYSIS_TYPES as readonly string[]).includes(payload.type)
      ? (payload.type as AnalysisType)
      : undefined;

  // A screenshot is accepted only as one of three raster types, under a size
  // the Worker and the API both handle comfortably. No SVG, no HTML, nothing
  // that could be executed, and the bytes are never written or logged.
  let image: AnalyzeImage | undefined;
  if (payload.image !== undefined && payload.image !== null) {
    const candidate = payload.image as { media_type?: unknown; data?: unknown };
    const mediaType = typeof candidate.media_type === "string" ? candidate.media_type : "";
    const data = typeof candidate.data === "string" ? candidate.data : "";
    if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mediaType) || !data) {
      return c.json({ error: "bad_image" }, 415);
    }
    // Base64 carries about 3 bytes for every 4 characters.
    if (Math.floor((data.length * 3) / 4) > MAX_IMAGE_BYTES) {
      return c.json({ error: "image_too_large" }, 413);
    }
    image = { media_type: mediaType as AnalyzeImage["media_type"], data };
  }

  if (text.length === 0 && !image) return c.json({ error: "bad_request" }, 400);
  if (text.length > MAX_INPUT_CHARS) return c.json({ error: "too_long" }, 413);

  if (!(await allowRequest(c.req.raw, c.env.ANALYZE_LIMITER))) {
    return c.json({ error: "rate_limited" }, 429);
  }

  // Checked after validation so a too-long paste still gets its own message.
  const apiKey = gatewayKey(c.env);
  if (!apiKey) {
    return c.json({ error: "server_error", message: "engine not configured" }, 503);
  }

  // Deterministic, before the model is asked anything: parse only, never fetch.
  const urlFacts = text ? inspectText(text) : null;
  const linkFacts = urlFacts
    ? `hostname=${urlFacts.hostname}; registrable=${urlFacts.registrable}; https=${urlFacts.https}; signals=${urlFacts.signals.join(",") || "none"}`
    : undefined;

  try {
    const result = await runEngine({
      apiKey,
      baseURL: c.env.ANTHROPIC_BASE_URL,
      model: chosenModel(c.env, c.req.header("X-DARA-Model")),
      fallbacks: (c.env.ANTHROPIC_MODEL_FALLBACKS ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean),
      thinking: c.env.ENGINE_THINKING,
      text,
      lang,
      channel,
      type: analysisType,
      image,
      linkFacts,
    });

    // The government-impersonation signal needs the model's read of who the
    // message claims to be, so it is added once that is known.
    const urlSignals: UrlSignalCode[] = urlFacts ? [...urlFacts.signals] : [];
    if (urlFacts) {
      const claim = governmentImpersonationSignal(urlFacts, result.category);
      if (claim) urlSignals.push(claim);
    }

    // Compared in code against verified evidence only. The corpus is empty
    // until real evidence is added, so today this is always null.
    const match = matchVerifiedPattern({
      category: result.category,
      impersonated_entity: result.impersonated_entity,
      channel,
      attack_goal: result.attack_goal,
      pressure_methods: result.pressure_methods,
      url_signals: urlSignals,
    });
    const pattern = match ? patternById(match.pattern_id) : null;

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
      attack_goal: result.attack_goal,
      requested_action: result.requested_action,
      pressure_methods: result.pressure_methods,
      input_kind: image ? "image" : "text",
      model: result.model,
      latency_ms: result.latency_ms,
      usage: result.usage,
    };

    if (result.extracted_text) response.extracted_text = result.extracted_text;

    // The Jordan layer: facts about the domain or the number inside the
    // message, checked against the verified directory, the documented
    // campaigns and D1. It never blocks the verdict — if this fails the
    // screen simply has one block fewer.
    try {
      const subject = result.extracted_text ?? text;
      const found = subject ? await layerForText(c.env.DB, subject) : null;
      if (found) {
        response.jordan_layer = {
          subject: found.subject,
          kind: found.kind,
          layer: found.layer as unknown as Record<string, unknown>,
        };
      }
    } catch (error) {
      console.error("jordan layer failed:", (error as Error).message);
    }
    if (result.evidence_items.length > 0) response.evidence_items = result.evidence_items;
    if (urlFacts) {
      response.url_analysis = {
        url: urlFacts.url,
        hostname: urlFacts.hostname,
        signals: urlSignals,
      };
    }
    if (match && pattern) {
      response.known_threat_match = {
        pattern_id: match.pattern_id,
        title_ar: pattern.title_ar,
        title_en: pattern.title_en,
        confidence: match.confidence,
        matched_signals: match.matched_signals,
        source_name: pattern.source_name,
      };
    }
    // The eval reads the filter counters; the app ignores them.
    response.stats = result.stats;
    return c.json(response);
  } catch (error) {
    if (error instanceof EngineModelUnavailable) {
      console.error((error as Error).message);
      return c.json({ error: "model_unavailable" }, 502);
    }
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

  const threatType = (THREAT_TYPES as readonly string[]).includes(payload.threat_type as string)
    ? (payload.threat_type as ThreatType)
    : null;
  const authority = (RELEVANT_AUTHORITIES as readonly string[]).includes(
    payload.relevant_authority as string,
  )
    ? (payload.relevant_authority as RelevantAuthority)
    : null;
  const description =
    typeof payload.description === "string" && payload.description.trim()
      ? payload.description.trim().slice(0, MAX_INPUT_CHARS)
      : null;

  // Anonymous unless the person turned it off themselves. While it is on, a
  // contact that was typed and then hidden is dropped here rather than stored:
  // the column stays empty, not "empty as far as the screen knows".
  const anonymous = payload.anonymous === false ? 0 : 1;
  const contact =
    anonymous === 0 && typeof payload.contact === "string" && payload.contact.trim()
      ? payload.contact.trim().slice(0, 200)
      : null;

  try {
    // No IP, user agent or device column exists to write to. See migrations/.
    //
    // is_public is deliberately not settable from here. Nothing a visitor
    // submits joins the community feed; only the seeded rows are public until
    // someone marks a row by hand.
    const row = await c.env.DB.prepare(
      `INSERT INTO reports
         (source, category, verdict, confidence, impersonated_entity, channel, message_text,
          is_test, threat_type, description, relevant_authority, anonymous, contact)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       RETURNING id, status`,
    )
      .bind(
        source,
        category,
        verdict,
        confidence,
        entity,
        channel,
        messageText,
        isTest,
        threatType,
        description,
        authority,
        anonymous,
        contact,
      )
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

/**
 * The escape hatch for a phone that will not let go of an old build.
 *
 * The app is a PWA: its service worker precaches index.html and answers every
 * navigation from that cache, so a browser holding a stale worker keeps showing
 * the old UI no matter how many times the origin is redeployed — and a query
 * string does not help, because the navigation route matches regardless of one.
 *
 * This page is reachable because it sits under /api/, which is in the service
 * worker's navigateFallbackDenylist (vite.config.ts). A stale worker does not
 * intercept it, so the request reaches the network and this code — served fresh
 * — can unregister the worker, delete its caches, and send the browser back to
 * a genuinely current app.
 */
app.get("/api/reset", (c) => {
  return c.html(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DARA' — reset this device</title>
<style>
  body { margin:0; min-height:100dvh; display:flex; align-items:center; justify-content:center;
         background:#F7F8FA; color:#111827; font:16px/1.5 system-ui, sans-serif; padding:24px; }
  main { max-width:22rem; text-align:center; }
  h1 { font-size:20px; margin:0 0 8px; }
  p { margin:0; color:#4B5563; }
  code { font-size:13px; color:#4B5563; }
</style>
</head>
<body>
<main>
  <h1>Clearing this device's copy</h1>
  <p id="status">Working…</p>
</main>
<script>
(async function () {
  var done = [];
  try {
    if ("serviceWorker" in navigator) {
      var regs = await navigator.serviceWorker.getRegistrations();
      for (var i = 0; i < regs.length; i++) { await regs[i].unregister(); }
      done.push(regs.length + " service worker(s) removed");
    }
  } catch (e) { done.push("service workers: " + e.message); }
  try {
    if (window.caches) {
      var names = await caches.keys();
      await Promise.all(names.map(function (n) { return caches.delete(n); }));
      done.push(names.length + " cache(s) cleared");
    }
  } catch (e) { done.push("caches: " + e.message); }
  document.getElementById("status").textContent =
    done.join(" \u00b7 ") + " \u2014 opening the app\u2026";
  setTimeout(function () { location.replace("/?fresh=" + Date.now()); }, 1400);
})();
</script>
</body>
</html>`);
});

/**
 * The Community Reports feed: the last four reports explicitly marked public.
 *
 * It selects the type and the description and nothing else — never a contact,
 * never the analysed message, never whether the reporter stayed anonymous.
 */
app.get("/api/reports/community", async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT id, threat_type, description, is_seed
         FROM reports
        WHERE is_public = 1 AND is_test = 0 AND description IS NOT NULL
        ORDER BY id DESC
        LIMIT 4`,
    ).all<{ id: number; threat_type: string | null; description: string; is_seed: number }>();

    const reports: CommunityReport[] = (rows.results ?? []).map((row) => ({
      case_number: caseNumberFor(row.id),
      threat_type: (row.threat_type ?? "other") as CommunityReport["threat_type"],
      description: row.description,
      // The screen marks these as examples rather than leaving a presenter to
      // remember to say it.
      is_seed: row.is_seed === 1,
    }));
    return c.json({ reports });
  } catch (error) {
    console.error("community feed failed:", (error as Error).message);
    return c.json({ reports: [] });
  }
});

/**
 * Report counts per category, for the "Known Threats in Jordan" list. An
 * aggregate only: no report's contents are ever read back over the API, and
 * rehearsal rows are excluded. On any failure this answers with no counts,
 * which the UI renders as "Known pattern" rather than a number.
 */
app.get("/api/threats", async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT category, COUNT(*) AS n FROM reports WHERE is_test = 0 GROUP BY category`,
    ).all<{ category: string; n: number }>();

    const counts: Record<string, number> = {};
    for (const row of rows.results ?? []) counts[row.category] = row.n;
    return c.json({ counts });
  } catch (error) {
    console.error("threat counts failed:", (error as Error).message);
    return c.json({ counts: {} });
  }
});

// The bare path too: "/api/*" does not match "/api", which would otherwise
// fall through to the asset server and answer with the app's index.html.
/**
 * The Jordan radar. Counts of rows in D1 and nothing else — see routes/radar.ts
 * for why every list can legitimately come back empty.
 */
app.get("/api/radar", async (c) => {
  try {
    return c.json(await radar(c.env.DB));
  } catch {
    return c.json({ error: "server_error" }, 500);
  }
});

/** Check one domain, number or alias against what DARA' can actually confirm. */
app.post("/api/lookup", async (c) => {
  let payload: { q?: unknown };
  try {
    payload = (await c.req.json()) as { q?: unknown };
  } catch {
    return c.json({ error: "bad_request" }, 400);
  }

  const q = typeof payload.q === "string" ? payload.q.trim() : "";
  if (!q) return c.json({ error: "bad_request" }, 400);

  try {
    return c.json(await lookup(c.env.DB, q));
  } catch {
    return c.json({ error: "server_error" }, 500);
  }
});

app.all("/api", (c) => c.json({ error: "not_found" }, 404));
app.all("/api/*", (c) => c.json({ error: "not_found" }, 404));

export default app;
