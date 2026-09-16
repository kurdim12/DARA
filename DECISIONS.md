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
- **Phase 2 — where the deck and the standing brief disagree, the deck wins, and here is every place that happened.** `--ink` is `#111111`, not the `#000000` in CLAUDE.md. Body text is 16px on a 1.6 line, not the larger sizes CLAUDE.md asked for — the deck's scale is h1 28 / h2 22 / body 16 / meta 13, and it is the thing the jury will have seen an hour earlier. Section numerals are Arabic-Indic (٠١ … ٠٦, and the Shield steps, and the marks inside a flagged message), while CLAUDE.md said Latin digits everywhere: case numbers, dates, percentages and the character counter stay Latin, because those are read aloud, typed back and compared against what a bank writes.
- The verdict states changed shape. CLAUDE.md described a solid red band for scam and a red outline for suspicious; the deck says only danger is red, so: `احتيال` is large red Kufi under a 2px red rule, `مشبوه` is ink on the second paper tone with a drawn warning mark, `تبدو سليمة` is ink with a drawn check. The glyphs are inline SVG, not emoji.
- **The safe verdict is still `تبدو سليمة`, not the deck's `آمن`.** The engine returns `likely_safe` and caps its own confidence at 90 for that verdict. Printing "safe" would be a stronger claim than the thing that produced it ever makes.
- **Detect keeps its own placeholder and `افحص الآن`.** The deck's `الصق الرسالة المشبوهة هنا` / `افحص` describes a message checker, and Detect was deliberately rebuilt as a universal input for a message, a link, a number or what a caller said. Phase 2's own rule is "same copy", so the copy stayed. One word and it switches.
- Red left the report buttons. The deck's palette reserves threat for danger verdicts, flagged spans, the Shield layer and destructive actions; sending an anonymous report is none of those. Red now appears in exactly four places: the danger verdict and its rule, the marks inside a flagged message, the Shield entry, and Shield's top rule and step numbers.
- **Home shows three layers, not six.** كشف، إبلاغ and درع الابتزاز are live; حماية، توعية and تعافي are Phase 3 and are simply absent, never "coming soon". حماية stays in the bottom nav because that four-destination architecture is frozen. `إبلاغ` points at بلاغاتي: there is no standalone report route and Phase 2 says the routes do not change.
- Both families are self-hosted through `@fontsource` (bundled, same origin, precached) rather than hand-placed files in `/public/fonts`. Same guarantee — no Google Fonts call at runtime — and it survives a dependency bump.
- The brief said to look for the mark at `/public/brand/mark.png`. It is at `/public/brand/dara-mark.png`, which is Abdelrahman's brush-stroke درع, already approved. No Reem Kufi wordmark was needed.
- **The loading line stops at 92% and stays there.** It is a thin ink rule under the header with `جارٍ الفحص…` beside it, filling over 12 seconds. It never reaches the end, because reaching the end would claim the check had finished when it has not.
- **Phase 3 — the three new layers are Arabic only.** The brief says "Arabic first; no English UI strings" and gives a flat `{ id, title, body, verified }` schema with no bilingual pair, so the content files hold Arabic. The chrome around them (titles, section labels, `جرّب الفحص`) is bilingual like the rest of the app, which means the English toggle leaves the body text in Arabic on those three screens. That is the brief's instruction rather than an oversight, and it is one line to change if he wants English too.
- The unverified rule was applied at the level of what a sentence *claims*, not what words it contains. "لا يطلب منك بنك رمز التحقق" is general safety guidance about a category, so it renders; "قدّم بلاغًا لدى الجهة المختصة واطلب رقمًا مرجعيًا" names a procedure at an institution, so it does not. One section in `recover.json` is hidden for that reason and nothing else is.
- No section names a company, a bank, a ministry or a municipality. The parking-fine and delivery advice describes the *shape* of the message, and the government-domain anatomy describes the check the app performs rather than printing a domain — so nothing in the three layers had to be invented or sourced.
- **توعية and تعافي are routes, not nav tabs.** The four-destination bottom nav is frozen; the two new screens are reached from Home's list and mark no tab as current while you are on them.
- The staged demo set grew to six so the runbook could have a legitimate control. `legit_otp` is the same subject as the staged OTP-theft call and the opposite verdict, which is the sharpest answer to "does it just say scam to everything?".
- `RecoverPaths.tsx` is deleted rather than kept alongside `/recover`. It rendered v1's unreviewed recovery text in dev only; keeping two recovery surfaces, one of them unreviewed, is how the wrong one ends up on a screen.
- **Rebuild to the submitted app, Phase 1 — the deck palette is gone.** Light and dark, blue primary, one red for danger, amber for caution, and green used for exactly one thing: a Safe verdict. The screens not yet rebuilt keep working because the old token names (`paper`, `ink`, `rule`, `threat`) now resolve through the new ones, so they follow the theme for free until their own phase replaces them. `CLAUDE.md` still says "no green, no blue" and needs updating, or the next reader will undo this.
- **Three verdicts, four levels.** `scam` → High, `suspicious` → Medium, and `likely_safe` splits on the engine's own confidence: 70 or above reads as Safe, below that as Low risk. The engine caps its confidence at 90 for that verdict by design, so a hesitant likely-safe never tells someone an unfamiliar message is fine. The threshold is one constant, `SAFE_CONFIDENCE` in `src/lib/level.ts`.
- **`type` and `channel` are different questions and both survive.** `channel` is how a thing reached you; `type` is what it is. `type` reaches the model as one line of framing and nothing else keys off it — not post-validation, not the tool schema, not the report row. Unknown values are dropped at the Worker rather than passed through, because that string ends up inside a prompt.
- **The threat counts are a D1 aggregate and nothing else.** `GET /api/threats` groups reports by category, excludes rehearsal rows, and reads no report's contents. Zero reports means the card says "Known pattern" — never a number without rows behind it. If the query fails the endpoint answers with no counts, so the UI degrades to "Known pattern" rather than to a wrong number.
- `content/threats.json` describes the **shape** of six message families the engine already models — the same families as the golden set. A title names the institution a scam impersonates, not an institution that did anything, and the file says so. There are no statistics, no phone numbers and no URLs in it.
- **Language and theme are kept for the browsing session, in `sessionStorage`, not `localStorage`.** In-memory alone would have thrown the app back to English and light on any reload, which is a hazard in front of an audience. Closing the tab forgets both, and no copy anywhere makes a claim about storage.
- **Report has no screen this phase.** The tab and the result screen's "Report this threat" both land on a placeholder with the header and one line, because Report is Phase 2. The old report flow is still reachable at `/detect` but nothing links to it, so for now the app cannot file a report. That is a gap between phases, not a decision to drop it.
- Protect and Learn are placeholders with the header and the tile's own sub-line. No "coming soon" anywhere — that is a label that tells a jury the app is unfinished.
- **Rebuild Phase 2 — `description` is its own column.** The brief named four new columns; the report's "What happened?" is a fifth. It is kept apart from `message_text`, which is the message that was analysed — they are different things, and the community feed reads only the description.
- **Nothing a visitor submits becomes public.** `is_public` is not settable through the API at all; the four seeded rows are the only public ones until someone marks a row by hand. That is what stops the Community Reports feed being filled by whoever is holding the phone during a demo. The feed selects the type and the description and nothing else — never a contact, never the analysed message, never whether the reporter stayed anonymous.
- **A contact is dropped, not hidden.** While the anonymous toggle is on, a contact that was typed and then hidden is not sent, and the Worker drops it again on its side. The column stays empty rather than "empty as far as the screen knows".
- **A number renders only when its `verified.json` entry says so, in every build — dev included.** The Shield cards show the name and "number pending verification" instead, and there is no `tel:` link behind them. An invented emergency number is worse than none, and this is the audience that will ask.
- The honesty gate learned two things rather than being loosened: a term inside an identifier (`cybercrime_unit`, `RELEVANT_AUTHORITIES`) is not copy, and two strings are approved by key with a written reason — the authority label, which names a body without claiming anything was sent to it, and the confirmation sentence, which contains "authority" and "forwarded" precisely because it is the denial. A term on any other line still fails the build; that was checked by adding a fake claim and watching it fail.
- **Shield keeps its quick exit**, on the guided-steps view only. The brief does not mention it, but it existed and it replaces the page rather than pushing, so Back cannot return to it. Removing a safety feature silently from the screen a frightened person reaches is not a thing to do quietly.
- The superseded deck screenshots moved to `docs/screens/_superseded-deck/` rather than being deleted — they show a design that no longer exists, and leaving them under `phase2/` and `phase3/` would have been actively confusing.
- **Rebuild Phase 3 — the quiz is three scams and three legitimate messages.** A quiz that is mostly scams teaches people to answer "scam", which is the opposite of what this app is for, and it is the same reason the demo runs a legitimate control message on stage.
- The honesty gate learned one more distinction rather than being loosened: a file can declare `_meta.specimens`, and a key listed there is a quoted sample — an invented scam message shown so a person learns to recognise it. The fake verification code inside one is exempt; every other string in the same file, including the app's own explanation of the tell, is not. Checked by putting a phone number in a `tell` line and watching the build fail.
- `official_report` is `verified: false` in two recovery plans — the step that says to ask for an official case reference. It names a procedure at an institution, so it does not render until someone has confirmed which body, the correct wording, and what a person actually receives.
- **The screens from the previous build are deleted, not left unreachable.** Detect, Reports, Protection and Educate, and the `content/layers/` files behind them, are gone: two Recover implementations and two Protect implementations in one repository is how the wrong one ends up on a screen. Their substance lives on in `content/protect.json`, `content/quiz.json` and `content/recover/*.json`, now in both languages.
- **Screenshot analysis has no UI any more.** The Worker still accepts an image on `/api/analyze`, and `src/lib/image.ts` still downscales one, but the submitted app's Scan screen has no image button and nothing reaches that path now. It is one button away if it is wanted back.
- The superseded deck screenshots live in `docs/screens/_superseded-deck/`. They show a design that no longer exists.
- **Design correction pass (14 Sep).** `/docs/reference/` was not in the repo, so the pass was worked from the written spec alone. Base font is 15px at ≤480px and steps back to 16px above 481px — the spec set the phone size and said nothing about wider screens, and a 15px desktop page reads cramped.
- Known Threats became one bordered card with hairline separators and the 3px danger edge inside it, and "See all known threats ›" is a row inside that card rather than a link floating under it. That is what stopped the list reading as three loose fragments.
- The Shield tab and the Home Shield tile both use the `user` icon, as the spec sets out. It reads oddly on its own — a person glyph for a shield — but it is what the reference app shows, and matching the submitted app was the point of the pass.
- `SectionLabel` (13/500 uppercase) is now used in exactly the four places the reference uses it; everything else takes a new `FieldLabel` at 15/600 in ink. That split is what makes the Report screen stop shouting.
- The document title is `DARA' — درع` and `index.html` carries light and dark `theme-color` tags for the first paint; the theme toggle overwrites both so a manual choice beats the system preference.
- **Facelift to the approved design system (14 Sep).** `/docs/reference/dara-facelift-mockup.html` was not in the repo, so the pass was worked from the written spec alone, the same way the correction pass before it was.
- **The palette is the brief's; which member of it goes where is not always.** `tokens.css` adds a documented second row — `--blue-fill`/`--red-fill`/`--green-fill` (fixed across themes, for a solid surface carrying white text) and `--blue-ink`/`--red-ink`/`--amber-ink`/`--on-amber`/`--amber-on-white`/`--disabled-ink` (small text on a tinted one). One hex cannot be both a fill and readable text on that fill in both themes: white on the dark theme's `--blue` is 3.5:1, on its `--red` 3.4:1, and 11px `--red` on `--red-soft` is 4.45:1. Every one of those was measured with axe in light, dark and Arabic, and every one now clears 4.5:1.
- **Page bottom padding is 78 + 30 + 24, not 78 + 24.** The bar is 78px but the raised Scan button reaches 30px above it, so the spec's own rule — "the raised Scan button never overlaps a PrimaryButton" — needs the button cleared, not the bar. At 78 + 24 the last line of Result, Shield and Report sat under the circle.
- **The verdict summary is full white, not 90%.** 90% white over `--red-fill` measures 4.15:1 and over `--green-fill` less. The 26/800 headline against 15/500 already carries the hierarchy.
- **The case number sits in a `--card` pill, not a `--mist` one.** The confirmation page is itself `--mist`; a mist pill on a mist page is not a pill.
- **Learn's specimen tag says "Message", not a channel.** `content/quiz.json` carries no channel per question and its `_meta.specimens` already declares what these are. Giving each one a delivery channel would be writing content, and this pass changes layout.
- **Three new i18n keys, for three controls the spec names and the app had no string for**: `home.paste_clipboard`, `scan.screenshot` and `shield.verify_tag`. No existing copy changed.
- **Screenshot analysis is back on screen, with two entry points** — "Scan a screenshot" on Home's scanner card and an outline pill on Scan. Both use the `prepareImage` path and the `image` field on `/api/analyze` that have been in the repo unreached since the rebuild. Checked end to end: picker, thumbnail, a request carrying `image.media_type`, and the verdict quoting the engine's `extracted_text`.
- **Report opens prefilled from a verdict.** `Report` has accepted a `prefill` prop since the rebuild and nothing passed one; "Report this threat" now carries the verdict's category, which chooses the threat-type chip, and the analysed text. The description is still the reporter's to write.
- **Both families are self-hosted from `/public/fonts` with explicit `unicode-range`.** Manrope carries Latin, IBM Plex Sans Arabic carries Arabic, and the range is what lets one stack serve both — without it the last matching face wins for every glyph and one script falls back to the system font. 252 KB, precached with the app shell, no Google Fonts at runtime. Licences in `public/fonts/LICENSES.txt`.
- **`src/components/Layout.tsx` is gone.** It was a second copy of the component kit that only the dev-only `/lab` route still imported. Two Page components and two PrimaryButtons in one repository is how the wrong one ends up on a screen.
- **A disabled button gets its own ink.** `--sky-2` with white text reads as "not yet" in light and as a live button in dark, where `--sky-2` is a mid-navy. `--disabled-ink` is white in light and 38% white in dark, so the primary action never looks tappable when it is not.
- **Visual pass (15 Sep).** The facelift was structurally right and looked generic, which is a fair thing to be told. Six changes, in order of effect: the real brush-stroke mark replaces the placeholder SVG shield in the hero; the hero is a navy gradient with one soft light rather than a flat slab; section headings went 17 → 20/800 against a 15/700 row title, because at 17 they were the same voice; the verdict runs edge to edge at 34/800; the page ground went a few points deeper so a white card has an edge; and two things that read as broken — misaligned tile titles, a pale-blue disabled button with white text on it — are fixed.
- **The verdict's reasons are numbered to match the message.** The flags inside the quoted message are already numbered `1`, `2`, `3`; the reasons under it carried three identical warning triangles, which said nothing about which mark each belonged to. Numbering both ends is the explanation, and it is the one thing on that screen a jury will follow with their eyes.
- **`--green-ink`, for green text on the page ground.** Deepening `--mist` pushed `#12805C` on it from 4.92:1 to 4.34:1, which broke Shield's anonymity line. Green on a white card still uses `--green`; only text on the ground uses the darker one.
- **Uppercase tracked labels now appear on the verdict screen too**, not only in the two places the facelift spec allowed. "WHAT YOU PASTED / WHY / WHAT TO DO NOW" at 11/800 is what gives that screen its structure once the cards came off, and it is the screen the demo is built around.
- **Merge Phase 1 — the mark is the identity.** `public/brand/dara-mark-white.png` is the brush stroke on transparency, so the header tile supplies the red and nothing is recoloured; the PWA icons are rendered from the same file by `scripts/icons.mjs`, which means the thing on a phone's home screen and the thing in the header are one artwork.
- **Red is reserved, and the blind re-skin broke that before it was caught.** Mapping the old blue onto red made toggles, radio dots, progress dots, the language pill and Shield's Call buttons red — none of which is the logo, the screen's one action, a danger verdict, a flagged span or the shield. They are ink. Home's hero would have become a full-bleed red slab; it is paper now, with the red on the tile.
- **Three fills that do not flip with the theme.** The dark theme lifts `--amber` and `--green` so they can be read *as text* on a dark page, and a lifted fill carries no legible label — white on the dark amber is 2.2:1. `--amber-fill`, `--green-fill` and `--red` stay put in both themes; `--on-amber` is ink, because nothing white clears 4.5:1 on amber. Same reason `--amber-on-white` exists: the danger card's button is the brush white in both themes, so amber text on it needs the dark amber in both.
- **`--red-ink` for dark.** `#C40C29` is right as a surface — the brush white on it is 5.6:1 — but as text on the dark card it is 2.85:1, so dark lifts it to `#EE5560`. Light needs no partner.
- **Rubik's Arabic subset and Almarai's Latin one are deliberately not loaded.** With `unicode-range` doing the routing, loading both would leave the stack order to decide which face renders Arabic; the brief says Almarai, so only Almarai declares the Arabic range.
- **In Arabic the brush mark stands alone.** The mark already reads درع; setting the same word in type beside it says it twice. Arabic gets the tile and the tagline, no Latin wordmark.
- **The Radar tab lands on Known Threats until Phase 2.** Every tab reaches a real screen and nothing renders "coming soon" — which is also what the inventory found was already true of this repo and should stay true through the merge.
- **A screen names itself and the nav decides which tab lights.** Threats, Protect and Learn were each claiming `active="home"`, so the Radar tab never lit on its own screen. `BELONGS_TO` in BottomNav now maps the non-tab screens onto their tab.

- **Home's merge keeps one door per job, not two.** The reference build's
  clipboard-consent card and its image chip both duplicated controls this card
  already shows: "Paste from clipboard" and "Scan a screenshot" sit under the
  box in both variants. A sixth chip also pushed the type row off a 390px
  screen. So the card keeps the two buttons, and what the reference had that
  this build did not — the sentence "the clipboard is read only when you press
  the button" — moved next to the button it describes. Pasting fills the box
  instead of analyzing straight away, which is the safer demo anyway: the
  person sees what was read before anything is sent.
- **The clipboard read has a 3-second deadline** (`src/lib/clipboard.ts`). With
  the permission withheld, Chromium's `readText()` never settles — it neither
  resolves nor rejects — so the old silent `catch` produced a dead button.
  Both callers now race it and say "the clipboard could not be read" instead.
- **Home's Arabic labels were rewritten into فصحى.** The clipboard strings and
  the drill subtitle arrived in the reference's colloquial Jordanian
  ("عندك رسالة بالحافظة؟", "بتعرف تميّزها؟") on a screen that is otherwise
  simple MSA. The merge brief allows fixing labels that mix registers on one
  screen; the rest of the ported colloquial copy is listed below and left for a
  decision, not rewritten today.
- **Dates render in Latin digits in Arabic too** (`src/lib/locale.ts`).
  `toLocaleDateString("ar-JO")` formats in Arabic-Indic digits, so Radar and the
  campaign strip were showing ٢٧ آب ٢٠٢٦ against CLAUDE.md's "Latin digits
  everywhere". The locale now carries `-u-nu-latn`; `test/digits.test.ts` fails
  without it.
- **The latest receipt on Home does not interpolate a status into a key.** The
  API only ever writes `received`; anything else falls back to it rather than
  printing `status.whatever` onto the screen.
- **The drill's tile counts the drill.** The reference's subtitle said three
  messages; this drill asks six. `test/drill-count.test.ts` reads
  `content/quiz.json` and fails if the copy and the content disagree, because a
  number about the app stated in the app's own copy is still a number under
  rule 4.
- **The radar's trend is padded to the eight weeks its heading names**
  (`padWeeks` in `worker/routes/radar.ts`). `GROUP BY` dropped quiet weeks, so
  "Last 8 weeks" sat over two bars of equal height with no axis. A zero week
  now draws nothing rather than a floor-height stub — a stub reads as a small
  count — and the first and last week are printed under a baseline.
- **`whitespace-nowrap` on the scanner's outline pills.** "Scan a screenshot"
  in Rubik is wider than the pill is tall, so the label wrapped and the pill
  outgrew its own height. Cairo and Rubik are wider than the Manrope they
  replaced; any fixed-height pill added from here needs the same guard.
- **`deploy-check` asks the deployment which commit it is**, by reading
  `__BUILD_ID__` back out of the live bundle, rather than comparing asset
  hashes. The SHA is baked into the bundle, so every commit changes the hash —
  three runs in a row reported BEHIND for commits that touched only markdown.
  The step now also names any of src, worker, shared, content, public,
  `vite.config.ts` or `wrangler.jsonc` that changed in the gap.
- **The font check reads content types, not status codes.** A missing
  `/fonts/*.woff2` falls through to the SPA catch-all and returns index.html
  with a 200, which is exactly what the step had been reporting as a pass — for
  two font files Phase 1 had replaced.
- **The emergency button states the number it dials.** `shield.call_now` read
  "Call 911 Now" while its `href` came from `content/verified.json`. One flag
  gated both, which is what the honesty gate's exception said — but the flag is
  shared and the value is not, so verifying a different line would have shipped
  a button labelled 911 that dialled something else. The label now carries
  `{0}`, filled from the same record, and the gate's exception for that key is
  deleted rather than reworded. Checked by flipping `verified` to true
  locally: the button reads "اتصل بـ 911 الآن" with `tel:911`, and the flag is
  back to false — only Abdelrahman flips those.
- **The confirmation sentence points at Help, not "the Shield tab".** The merge
  moved the extortion shield under Help; the sentence had kept the old nav.
- **Which result button is red follows `report_recommended`.** A green "looks
  safe" verdict with a red "Report this message" under it says danger where the
  screen has just said there is none, so on a safe result "Check another" is
  the primary and reporting is the outline. Both are always present.
- **`test/keys.test.ts` guards every interpolated i18n key.** The result screen
  builds keys from server values — `pressure.${method}`, `goal.${goal}`,
  `evidence.${type}`, `url.${signal}` — and `t()` falls through to the raw key,
  so a gap prints `pressure.threat` onto the verdict. Every value
  `postValidate` can emit is now checked for wording in both languages, along
  with key parity and blank strings.
- **The result's screenshots are rendered from a fixture, not the engine.**
  With no API key on the deployment there is no way to produce a real verdict,
  so `docs/screens/merge-3/result-*.png` come from an intercepted
  `/api/analyze`. They are layout evidence and nothing else; see the README in
  that folder.
- **Home's fourth quick tool is Recover, not "Learn".** The brief lists
  Directory, Check before you pay, Two-minute drill and Learn. In this app
  Learn *is* the two-minute drill — one screen, already the third tile — so a
  fourth tile pointing at it would be a second door to the same place. Recover
  took the slot; without it, Recover appears only under Help. Shield is still
  reachable from Help and from any result that routes there.
- **"Check before you pay" and "Official institutions" share a screen but not a
  job.** Both open Protect; the first lands with the cursor in the lookup (a
  one-shot intent through `App`, consumed on arrival), the second on the list.
  That is the brief's four tools without four destinations that do not exist.
- **The transparency page is still not built, and the runbook says so.** Its
  ported copy states accuracy figures for the reference build's on-device
  classifier, which this app does not run, so rendering it as written would be
  a false claim. DEMO-RUNBOOK.md names the four places the app does admit what
  it does not know, and tells the presenter not to describe a screen that is
  not there.

- **The engine goes through OpenRouter, and the UI stops naming a vendor.**
  OpenRouter exposes `POST /api/v1/messages` in the Anthropic Messages API
  format, so the switch is `ANTHROPIC_BASE_URL` plus a prefixed model id — the
  forced tool call, the image block and the whole post-validation chain are
  untouched. "مدعوم بتقنية Claude" was true only while the engine called
  Claude; it now reads "تحليل بالذكاء الاصطناعي عبر خادم درع", which stays true
  whichever model wins, and `honesty-check.mjs` fails the build if any
  dictionary names a vendor the configured model does not belong to.
- **Claude Fable 5.1 — the top model on the board — cannot run this engine.**
  It rejects forced tool use with a 400, and every scan forces
  `tool_choice: {type:"tool", name:"report_verdict"}`. `scripts/candidates.mjs`
  generalises the trap: it filters OpenRouter's public catalogue to models that
  do both tools and images, and flags any that advertise `tools` without
  `tool_choice`.
- **A rejected model is its own error now** (`model_unavailable`, 502). A wrong
  or unentitled model id used to arrive as `server_error` on every case, which
  is indistinguishable from the model being down. The user-facing message is
  unchanged — a person does not need to know the id is wrong — but the eval
  report and the Worker log now say which it was. A model id is config, not a
  credential, so naming it costs nothing.
- **The eval's model override is an allowlist read from config**
  (`ANTHROPIC_MODEL_CANDIDATES`), not a hardcoded set and not a prefix match. A
  prefix match would not be an allowlist: `anthropic/` accepts everything
  behind it, and the override would become a way to spend this account's
  credits on any model in the catalogue.
- **`bareModel()` strips the vendor prefix before the per-model profile runs.**
  Every profile test is a prefix match on `claude-…`, so `anthropic/claude-…`
  would have silently matched nothing — sending Haiku's `temperature` to
  Sonnet, or omitting `thinking: disabled` where it belongs. A non-Claude model
  now gets neither field: both are Anthropic's, and through a gateway they
  reach a model that 400s on them or ignores them.
- **The model is `openai/gpt-6-astra`, chosen from the live catalogue rather
  than from memory.** 443 models on OpenRouter, 137 of which do both tool
  calling and image input; of the frontier tier that does, `gpt-6-astra` is the
  newest non-Anthropic flagship — $10/$50 per million, 1.05M context. That is
  roughly 7 cents a scan against Sonnet's 1–2. `openai/gpt-5.5`,
  `openai/gpt-5.4` and `anthropic/claude-opus-5` are the candidates; the last is
  there as a control, so the eval can show what the switch cost.
- **OpenRouter's own metadata confirms Fable 5.1 cannot do forced tool use.**
  It is the one model in the frontier tier whose `tool_choice` column reads no.
  That agreement is reassuring but it is still metadata, not a guarantee, for
  any of the others — the golden set is the proof, and the thing it has to
  prove is not the verdict but whether the Arabic quotes come back verbatim.
- **"Works always" is a chain, not a model.** Three layers now: OpenRouter
  retries a different provider for the same model without being asked; the
  engine walks `ANTHROPIC_MODEL_FALLBACKS` when a model is rate-limited, gone,
  or refuses the request shape; and the staged demo messages fall back to a
  cached verdict on the device. The chain deliberately spans two vendors, so
  one vendor having a bad morning is not the demo's problem.
- **A timeout never falls back.** The wall is ten seconds and a timeout has
  already spent it; a second attempt would leave a presenter watching a spinner
  instead of an error they can move past. Fast failures are the retryable ones,
  and they are also the common ones. `test/model-chain.test.ts` pins that rule
  along with the walk order and the de-duplication.

- **The three help-line numbers were replaced with Abdelrahman's set, and all
  three remain `verified: false`.** Rule 3 says only he flips those, after
  reading an official source, and I am not one. What I could do is check them
  against what the file held and against published sources: 911 corroborated as
  the unified emergency number; the cybercrime unit's 196 with extensions
  812594 / 812232 corroborated, replacing a `+962 6 465 5660` carried from v1
  that matches no published number; the Family Protection line **not**
  corroborated, and it replaces a `110` that this file had attributed to the
  wrong body — 110 is the Jordan River Foundation's families-and-children
  helpline, a charity line, not the PSD directorate the row names. Each row's
  `note` records which of those it is.
- **A switchboard-plus-extension number is stored as two fields.** 196 and
  812594 glued into one `tel:` link dials 196812594, which nobody answers. The
  number column dials the short code and the extension is printed beside it —
  "196 · تحويلة 812594 / 812232". Checked by flipping all three flags locally
  and reading the rendered `href`s: `tel:196`, not `tel:196812594`. The flags
  are back to false.
- **`test/contacts.test.ts` asserts the file is still a staging area.** Every
  contact must render its name while hiding its number, no unverified row may
  leak a number or an extension, and no flag may be true. The last one will
  fail the day Abdelrahman verifies a number — deliberately, so that flip is a
  conscious commit and not a surprise in a diff.
- **The help-line numbers are not just stale, the published sources disagree.**
  Family Protection alone has four: 911 (PSD's own service page routes family
  violence through it and the ammn911 app), 06 580 0500 (Abdelrahman's table),
  06 581 5826 (secondary directories), and the 110 this file used to carry,
  which belongs to a charity. Cybercrime has three: 196 with extensions, a
  direct 06 563 3404, and the v1 number that matches nothing. Picking one would
  be inventing a fact, so every contact now carries a `candidates` list — each
  number, how it was described, and where it was seen. A test asserts the
  number a row ships is one of its own candidates, so nothing can appear from
  nowhere.
- **The official pages were added as `links`, because a link cannot go stale the
  way a cached extension can.** psd.gov.jo is the authority for all three, and
  checking a link is opening it once. If the numbers stay unresolvable, the
  honest Shield screen is 911 plus "the directorate's page", not three numbers
  nobody has confirmed.

## Arabic by default

- **The app opens in Arabic, right-to-left, and English is the switch.** It had
  been opening in English with عر as the way in, which asked a person in Amman
  holding an Arabic SMS to translate the app before they could ask it anything.
  `index.html` ships `lang="ar" dir="rtl"` so the FIRST PAINT is right-to-left —
  deciding it in React only would draw the page the wrong way round and flip it
  a frame later, the most visible bug an RTL app can have.
- **The choice lives in sessionStorage, not localStorage.** A reload mid-demo
  keeps the presenter's language, and closing the tab forgets it, so a relaunch
  on stage always comes back to Arabic. No copy claims anything about storage.
- **Making Arabic the default made the Arabic copy the copy that gets read, and
  that exposed a live bug.** `report.pilot_note` — the pilot/no-authority
  sentence a jury is most likely to read — sent people to "تبويب الحماية", and
  its English twin to "the Help tab", months after the bar stopped having
  either; the tab is تعافي. Both now name the tab that exists, and a test walks
  every string that mentions a tab against the five in `BottomNav`, so copy
  cannot point at a tab that is not there again.

## The key is named for the gateway, not the wire format

- **`ANTHROPIC_API_KEY` became `OPENROUTER_API_KEY`.** The old name read as "you
  need an Anthropic account and Claude credits", and Abdelrahman reasonably
  concluded he was being asked to pay twice. He is not: `ANTHROPIC_BASE_URL` is
  OpenRouter, the configured model is `openai/gpt-6-astra`, and every call —
  including the `anthropic/claude-opus-5` fallback — is billed on one OpenRouter
  balance. A name that misleads the one person who has to set it is a bug.
- **The old name is still read, second.** One accessor, `gatewayKey(env)`, is
  used by both `/api/health` and the scan, so presence and use can never
  disagree — health green with the scan 503ing is the worst failure this could
  have on demo day. A deployment carrying the old secret keeps working.

## فحص moves to the middle

- **Tab order is now الرئيسية · بلاغاتي · فحص · الرادار · تعافي.** Phase 1 rendered
  the brief's ordered list, which put فحص second, and flagged that the same
  paragraph called it "the raised centre button" — the brief contradicted
  itself and only Abdelrahman could say which half was meant. He chose the
  centre. A raised red circle sitting 78px off centre reads as a bug to
  everyone who never saw the list.
- **Measured, not assumed: 0.0px off centre in both directions.** The row is a
  flex row, so RTL mirrors it for free and only فحص's neighbours swap sides. A
  test pins the order, pins that the raised tab is the exact middle of an
  odd-length row, and pins that BottomNav and DEMO-RUNBOOK.md describe the same
  bar — the runbook was still on the old order and the test caught it.

## One input card on Home and فحص

- **`ScanInputCard` replaces `ScannerCard` and Home's clipboard card.** Home had
  two clipboard paths — a "paste" link inside the box and a card below it that
  read and submitted in one press — so the only way to see what was about to be
  sent was to watch it go. Now paste fills the field and «افحص الآن» is the only
  scan trigger on the page. `ScannerCard` was deleted rather than left behind,
  because a second input component is how the two screens drift apart.
- **Chips wrap instead of scrolling, at a 12px row gap.** The fifth chip used to
  sit half past the right edge of a 390px screen with nothing to say it was
  there. The gap is 12px, not 8px, because `.tap` expands a 34px chip's hit area
  to 44px — 5px past each edge — and on an 8px gap the second row's expansion
  painted over the first row's and stole the tap. Measured with
  `elementFromPoint`, not with a bounding box, which cannot see a pseudo-element.
- **Detection runs on any change to the field, not only on the «لصق» button,**
  because most people paste with the keyboard or a long-press, not our button.
  It yields permanently once someone taps a chip themselves: «رابط» and «موقع»
  are a real judgement call and an app that keeps undoing that judgement is
  worse than one that never guessed.
- **`--ink-2` was NOT darkened — it already passes.** 6.87:1 on paper and 7.26:1
  on card in light, 8.35:1 and 7.81:1 in dark, against a 4.5:1 bar. Darkening it
  would have flattened the ink/ink-2 hierarchy for no accessibility gain. What
  was actually under the bar was size, not colour: nav labels at 11px,
  `SectionLabel` and `.t-meta` at 12px. Those are now 13px.
- **«افحص الآن» lights up on any content, so short input had to start
  explaining itself.** Scan's 8-character floor previously made the button
  silently do nothing; `scan.too_short` says what to do instead.
