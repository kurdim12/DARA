# DECISIONS.md

One line per default I chose so Abdelrahman didn't have to. Newest last.

## Phase 0 — scaffold and config

- Scaffolded Vite + React + TypeScript by hand instead of `create-cloudflare`: c3 v2.72.6 blocks on an interactive "select a variant" prompt even with `--lang=ts --no-deploy --no-git`, so it cannot run in this session. The result is the same stack the c3 React template produces (Vite, `@cloudflare/vite-plugin`, Wrangler, Worker + assets from one deploy).
- Checked the Wrangler config against the JSON schema shipped inside the installed `wrangler` 4.131 (`node_modules/wrangler/config-schema.json`) rather than from memory: `assets.not_found_handling: "single-page-application"` for SPA routing, `assets.run_worker_first: ["/api/*"]` to send the API to the Worker, `d1_databases[].migrations_dir`, and the first-class `ratelimits[]` block.
- Left `assets.directory` out of wrangler.jsonc: the Vite plugin sets it from the build output (`dist/client`), confirmed by `wrangler deploy --dry-run`.
- `compatibility_date` is 2026-09-10 with `nodejs_compat`, which the Anthropic SDK needs on Workers.
- Local development is `vite dev`, not `wrangler dev`. Bare `wrangler dev` picks up the generated `dist/dara/wrangler.json` and serves the *last build* instead of the current source — that cost an hour of chasing a phantom bug, so `npm run dev` is Vite.
- Paper is `#F4EFE6`, a **placeholder**. `reference/brand/dara-mark.png` is not in the kit, so nothing could be sampled. `npm run brand:sample` replaces it with the exact colour from the mark, copies the mark to `public/brand/`, and renders the three PWA icons — one command, once the file is there.
- The PWA icons currently in `public/icons/` are blank squares in the paper colour. The app is installable now; the icons become the mark when `npm run brand:sample` runs.
- Until the mark is present the app renders the word درع as plain text rather than drawing a lookalike. The mark is never redrawn, recoloured or traced.
- Type is IBM Plex Sans Arabic, self-hosted through `@fontsource` (no Google Fonts CDN, so the demo does not depend on venue internet). `reference/deck.pdf` is not in the kit, so `pdffonts` could not be run.

## Phase 1 — engine

- The engine prompt in `worker/engine/prompt.ts` is BUILD.md's text, unedited. It is Abdelrahman's layer.
- Sonnet 5 **rejects** `temperature` (400), so it is not sent for that model. Haiku 4.5 still accepts it and gets `temperature: 0`. BUILD.md's "use low temperature if the current API and model accept it" resolves to: only Haiku.
- Thinking is set to `{ type: "disabled" }` on Sonnet 5. Omitting `thinking` there now runs *adaptive* thinking, which would share the 800-token budget and spend seconds this demo does not have. The `ENGINE_THINKING` var flips it to `adaptive` (and raises `max_tokens` to 4000) if the eval shows quality needs it.
- `maxRetries: 0` on the Anthropic client: a retry inside the 10-second wall would spend the whole latency budget. The `AbortController` is the only deadline.
- No `strict: true` on the tool: the schema uses a `["string", "null"]` union for `impersonated_entity`, which strict mode may reject. Forced tool choice plus the post-validation below is the safer combination.
- An action mentioning a phone number or URL that is **not** in the pasted message is dropped whole, not edited. BUILD.md says to remove the number; removing only the token leaves a sentence with a hole, and a missing action is better than a broken one.
- Two red flags whose highlights overlap cannot both render, so the first is kept and the second dropped; the eval counts them separately from unmatched quotes.
- `route_to_shield` is forced true whenever the category is `extortion`, regardless of what the engine returned — that is a pass rule, not the engine's call.
- Quote matching ignores diacritics, tatweel, bidi marks, digit form and whitespace runs, but the offsets it returns always point into the untouched original. 22 unit tests cover it (`npm test`).

## Phase 1 — API surface

- `/api/analyze` accepts an `X-DARA-Model` header, honoured **only** for `claude-sonnet-5` and `claude-haiku-4-5` (plus the dated Haiku id). Without it the eval could not compare both candidates against one deployment without two deploys. Any other value is ignored.
- Rate limit is 30 requests per minute per IP, not 12: a full eval run is 22 requests and 12/min would have made the harness fight the limiter. The Worker uses the `ANALYZE_LIMITER` binding when it exists and an in-isolate fixed window when it does not, so deleting the `ratelimits` block cannot break the deploy.
- The address used for rate limiting is held in memory for one window and is never written to the database or a log. No report row has an IP, user agent or device column.
- `latency_ms` and a `stats` object (flags returned / kept / dropped, actions dropped) ride along in the analyze response; the app ignores them, the eval reads them.

## Phase 2 — flow

- The case number is derived from the row id (`DR-2026-` + 5 digits) and never stored, so there is one source of truth.
- `GET /api/report/:case_number` returns the status only — never the report's contents.
- Base CSS lives in `@layer base`. An unlayered `button { color: inherit }` silently beat Tailwind's `text-paper` and painted the primary button's label black on black; layering it fixed that.
- `text-decoration-skip-ink: none` on the red-flag underline: Arabic sets many dots below the baseline and skip-ink chopped the underline into crumbs.
- Engine-produced text (headline, why, actions) renders with `dir="auto"`, because its language does not have to match the interface language.

## Phase 3 — Shield, PWA

- Quick exit is sticky, so it stays reachable on every Shield screen rather than scrolling away.
- Unverified v1 content (every phone number, law and penalty) renders only in a dev build, with a visible VERIFY tag. A production build shows the text with no number.
- The service worker precaches the shell and the fonts and never caches `/api/*`, so a stale verdict can never be served as a live one.

## Phase 4 — demo

- The saved-result fallback fires only when the pasted text matches a staged message exactly **and** the live check is offline, failed, or has passed 8 seconds. Every other input has no fallback at all.
- `src/demo/cached-verdicts.json` ships empty. `npm run cache-demo -- --target <url>` fills it with real outputs stamped with the model and time.
