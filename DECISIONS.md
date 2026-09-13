# DECISIONS.md

One line per default I chose so Abdelrahman didn't have to. Newest last.

## Phase 0 — scaffold and config

- Scaffolded Vite + React + TypeScript by hand instead of `create-cloudflare`: c3 v2.72.6 blocks on an interactive "select a variant" prompt even with `--lang=ts --no-deploy --no-git`, so it cannot run in this session. The result is the same stack the c3 React template produces (Vite, `@cloudflare/vite-plugin`, Wrangler, Worker + assets from one deploy).
- Checked the Wrangler config against the JSON schema shipped inside the installed `wrangler` 4.131 (`node_modules/wrangler/config-schema.json`) rather than from memory: `assets.not_found_handling: "single-page-application"` for SPA routing, `assets.run_worker_first: ["/api/*"]` to send the API to the Worker, `d1_databases[].migrations_dir`, and the first-class `ratelimits[]` block.
- Left `assets.directory` out of wrangler.jsonc: the Vite plugin sets it from the build output (`dist/client`), confirmed by `wrangler deploy --dry-run`.
- `compatibility_date` is 2026-09-10 with `nodejs_compat`, which the Anthropic SDK needs on Workers.
- Local development is `vite dev`, not `wrangler dev`. Bare `wrangler dev` picks up the generated `dist/dara/wrangler.json` and serves the *last build* instead of the current source — that cost an hour of chasing a phantom bug, so `npm run dev` is Vite.
- Paper is `#F4EFE6`, a **placeholder**. `reference/brand/dara-mark.png` is not in the kit, so nothing could be sampled. `npm run brand:apply` replaces it with the exact colour from the mark, copies the mark to `public/brand/`, and renders the three PWA icons — one command, once the file is there.
- The PWA icons currently in `public/icons/` are blank squares in the paper colour. The app is installable now; the icons become the mark when `npm run brand:apply` runs.
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

## Post-deploy findings (Cloudflare Workers Builds)

- The CI build failed because `worker-configuration.d.ts` is generated by `wrangler types` and gitignored, while `tsconfig.worker.json` requires it. `npm run build` is now `wrangler types && vite build`, so it generates what it needs, and typechecking moved wholly into `npm run verify`. A type error must not be able to block a deploy six days before the demo.
- `/api/health` now also reports `db_ready`. A deploy never runs migrations, so the Worker could be green while the `reports` table did not exist — and health was the one go/no-go check on the phone.
- All `/api` responses carry `Cache-Control: no-store`. Without it a browser may heuristically reuse `GET /api/health` and show a stale `key_present: false` long after the secret is set.
- `run_worker_first` now lists `/api` as well as `/api/*`: the pattern does not match the bare path, which was falling through to the asset server and answering with the app's index.html.
- `GET /api/report/:case_number` wraps its query, so a D1 error returns the same JSON error shape as every other route instead of Hono's text/plain default.
- The demo tray takes its staged messages from `content/eval-cases.json`, not from the saved verdicts, so it works before `npm run cache-demo` has ever run.
- The eval harness survives a network error: one case fails instead of the whole run, and a run that reached nothing is reported unreachable rather than as a pass.

## Audit findings, fixed

Twelve findings came out of a multi-agent audit of the deploy path and the app.
Each of these was reproduced by running the code before it was changed.

- **Invented phone numbers could reach the user.** The action filter compared a candidate number against every digit in the message concatenated into one string, so `0791234567` passed against a message containing `079123`, `4567` and `24` separately. It now matches against each run of digits individually. This was a breach of hard rule 4, and it only ever failed one way — letting a fabricated number through.
- **An action quoting the message's own URL was dropped.** The URL pattern swallowed the Arabic comma that normally follows a link in Arabic prose, so the action looked invented. Arabic punctuation is excluded from the match and stripped from the tail.
- **`ENGINE_THINKING=adaptive` would have broken Haiku.** The adaptive branch ran before the model profile was consulted, so flipping that var — the whole point of it existing — would have sent an unsupported shape to Haiku 4.5 and 400'd every request. Covered by a test now.
- **`max_tokens` raised from BUILD.md's 800 to 2000, and `stop_reason` is checked.** A full Arabic verdict (four quotes, four reasons, three actions) comes close enough to 800 that a long message could truncate the tool call; a truncated call still arrives as a tool_use block, so it surfaced as a generic error with nothing in the log to distinguish it. Output is billed on tokens produced, so the headroom costs nothing. This is a deliberate divergence from BUILD.md.
- **iOS turned numbers in the analyzed message into tappable `tel:` links.** `format-detection: telephone=no` is now set. This was the "never render text from an analyzed message as a clickable link" rule, and it would only have appeared on an iPhone.
- **The header and Shield's Quick exit sat under the status bar.** `viewport-fit=cover` was set with no safe-area insets. Both now use `env(safe-area-inset-*)`.
- **A plain tap could open the hidden demo tray.** The long-press timer was a render-scoped variable, and the missing brand mark guarantees a re-render mid-press, so the release could not cancel it. It is a ref now, cleared on unmount.
- **A redeploy stayed invisible until the next cold launch.** The service worker updated and claimed the page but nothing replaced the document. The app now reloads when a *new* worker takes over, never on first install.
- **`npm run brand:apply` left `index.html` behind.** The paper colour lives in three places and the sampler updated two, which would have left a seam between the status bar and the page.
- **The whole golden set shipped to the client.** The demo tray imported `content/eval-cases.json`, so every case and its expected verdict landed in the bundle. `npm run demo:stage` now writes a trimmed `src/demo/staged.json`, and a test fails if the two drift.

Accepted, not fixed: `content/v1-content.json` is still imported whole, so the unverified v1 contact numbers sit in the client bundle even though the production build never renders them. Nothing displays them, so rule 3 holds; splitting the file is a tidier follow-up, not a demo blocker.

## The real brand mark

- The mark is white brush strokes on a solid field, and that field is `#C40B29` — the same red the design system reserves for threat. It is shipped exactly as delivered: resized for the web, never redrawn, recoloured or traced.
- **Paper was NOT sampled from it.** CLAUDE.md says to take the page colour from the mark's background, but doing that here would paint the entire product in the one colour that is supposed to mean danger. Paper stays cream and red keeps its meaning. `npm run brand:apply` now checks this itself: it only adopts the sampled colour when that colour is a light, near-neutral tone, and otherwise leaves the palette alone and says why.
- One consequence worth Abdelrahman's eye: Home now carries a red mark and a red Shield entry, so red appears twice on a screen where nothing is a threat. If that reads as dilution, the fix is a version of the mark on paper rather than any change in code.
- The icons are the artwork itself, full-bleed. The maskable one pulls the strokes to 80% so a circular crop cannot cut them, while the red still reaches the edge.
- Downscaling averages the source pixels each destination pixel covers instead of sampling one. Nearest-neighbour turned the brush edges to crunch, and the texture is the mark.

## Analysis phase: screenshots, links, threat breakdown

- **Screenshot analysis is real.** The Worker sends the image to the Messages API as a base64 image block alongside the instructions. Syntax and the resolution ceiling were taken from the current docs, not from memory: Sonnet 5 reads up to 2576px on the long edge, so anything larger is downscaled on the device before it is sent.
- Accepted types are JPEG, PNG and WebP only, capped at 3 MB — comfortably inside both the Worker's and the API's limits. SVG and HTML are rejected with a 415, and nothing uploaded is ever executed, written to D1, logged, or kept: the bytes live in one request and in React state for one check.
- A PNG screenshot stays PNG through any downscale, because that is where small text survives. JPEG is only used as a fallback when PNG will not fit, and the quality steps down rather than the resolution.
- `extracted_text` and `evidence_items` are dropped by post-validation unless an image was actually sent. Without an image they could only have been imagined.
- Screenshots get a 25-second deadline instead of 10. Reading an image is a different job from reading a line of text, and the eval now reports the two latencies separately rather than averaging them into one misleading number.
- **URL inspection is deterministic and offline.** The module parses with the platform `URL` parser and computes signals from the string alone. It never fetches the destination, follows a redirect, or calls a reputation service, and the facts are handed to the model as context rather than being asked of it.
- The registrable-name calculation is an approximation — there is no public suffix list in the Worker — so `x.gov.jo` and `shop.company.com.jo` are read as one name each. It is named as an approximation in the code.
- `claimed_government_non_gov_jo` fires only when the engine says the message claims a Jordanian government body. A bank, telecom, courier or university on its own non-government domain is normal and is never flagged for it.
- **Verified Jordan threat matching is built and dormant.** `content/verified-threat-patterns.json` ships with an empty `patterns` array, so `matchVerifiedPattern` returns null and no pattern section can render. The matching is deterministic and done in code: the model is never asked "does this look like a known Jordan scam?", because it has no way to know and its answer would be a guess wearing the clothes of evidence. Fixtures used in tests are engine tests, never evidence.
- **The blocker:** no verified corpus exists in this repository. The only eval case marked `source: "real"` is `gam_parking_fine`, whose text is still the placeholder because `reference/gam-fake-fine.png` was never added, and `content/v1-content.json` is unverified throughout by its own `_meta`. One entry with a named source turns the feature on; nothing else is needed.
- **No D1 migration this phase.** Reports still store what they stored. If the structured fields are ever wanted on a report row, the additions would be `attack_goal`, `requested_action`, `pressure_methods` (as JSON), and `url_hostname` — deliberately not `url_analysis` wholesale, and never the screenshot bytes.

- **Phase 1 — the venue fallback is earned on the device, not only in the repo.** `npm run cache-demo` still writes real engine output into `src/demo/cached-verdicts.json`, but it needs a machine that can reach the deployment. A staged message checked live once on the demo phone now leaves that same real verdict in local storage, so the fallback exists without a deploy. Only the four staged messages are ever remembered, matched on exact text and language; nothing a person pastes is written down.
- The parking-fine family gets a stand-in, not a guess at the real SMS. `gam_parking_fine` keeps its slot and its placeholder; `parking_fine_reconstructed` sits beside it marked `source: "synthetic"` and says in its own note that it is a reconstruction, so it cannot be presented on stage as the real message.
- **The honesty gate now walks the content file** and skips any subtree marked `verified: false`, on the reasoning that gated content cannot reach production and so cannot mislead anyone. Everything else must not state a law, a penalty or a number without a flag. That rule, not a longer word list, is what would have caught the claim it missed.
- Quiet text buttons keep their size and gain a 44px hit area from a pseudo-element inside the button. Only the channel chips, the nav tabs and the Shield quick exit take a real min-height — the chips are the one visible change in Phase 1, noted for Phase 2.
- `/lab` is a development route from now on. It answered in production, and it prints the raw engine response.
- **The eval runs in CI**, because no machine that can run the harness can also reach the deployment. It talks only to the Worker, so no API key exists anywhere outside the Worker secret. Non-blocking: a bad verdict is reported, it does not fail the branch.
