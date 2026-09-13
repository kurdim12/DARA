# AUDIT.md — DARA' v2, Phase 0

Read-only audit. No code was changed.

- Date: Sun 13 Sep 2026
- Commit audited: `35bcf6d` on `claude/kind-cray-vyr1v6`, working tree clean
- Deployed URL: https://dara.abdalrhmankurdi12.workers.dev/
- `npm run typecheck` — pass. `npm run test` — 69 passed, 6 files. `npm run build` — pass.

## How this audit was run, and what it could not reach

**The deployed URL is not reachable from the machine this audit ran on.** Every
request to it is refused by the network egress proxy before it leaves the box:

```
curl https://dara.abdalrhmankurdi12.workers.dev/          -> curl: (56) CONNECT tunnel failed, response 403
curl https://dara.abdalrhmankurdi12.workers.dev/api/health -> curl: (56) CONNECT tunnel failed, response 403
```

`api.anthropic.com` is on the proxy's allowed list, but there is no API key on this
machine and there must not be — the key exists only as a Worker secret.

So sections 3 and 4 could not be run against the deployment as the brief asks.
Instead they were run against **the production build of the same commit**, served
locally by the Worker runtime (`npm run build` then `vite preview`, which runs the
real `worker/index.ts` in workerd against a local D1). That verifies everything
except the Anthropic call itself. Where a finding depends on the live engine it is
marked **UNVERIFIED ON THE DEPLOYMENT** and the exact command to run it is given.

---

## 1. Route map

Client-side routing only (`src/lib/router.ts`, `history.pushState`); the Worker
serves `index.html` for any non-`/api` path. All six routes were loaded at
390×844, iPhone user agent, RTL, on the production build.

| Route | File | Renders | API called | 390px RTL |
|---|---|---|---|---|
| `/` | `src/routes/Home.tsx` (97) | Wordmark, `حمايتك الرقمية تبدأ قبل أن تتصرّف.`, two entries (`افحص تهديدًا`, `تحتاج مساعدة الآن؟`), last-report block when one is stored locally | none | OK — no overflow, `dir=rtl`, `lang=ar` |
| `/detect` | `src/routes/Detect.tsx` (587) | One universal textarea, Paste + صورة, channel chips, `افحص الآن`; then the verdict screen (band, highlighted spans, `ما الذي يحدث هنا؟`, link signals, actions) | `POST /api/analyze` via `src/lib/api.ts:37` | OK — no overflow; 14 tap targets under 44px (A7) |
| `/reports` | `src/routes/Reports.tsx` (102) | Case numbers stored in this device's localStorage, each with its status | `GET /api/report/:case_number` (`src/routes/Reports.tsx:29`) | OK — no overflow |
| `/protection` | `src/routes/Protection.tsx` (41) | One entry into Shield; no content of its own yet | none | OK — no overflow |
| `/shield` | `src/routes/Shield.tsx` (182) | درع الابتزاز: intro, danger check, 6 steps, reassurance, anonymous report | `POST /api/report` via `src/lib/api.ts:124` | OK — no overflow; `خروج سريع` is 98×40 (A7) |
| `/lab` | `src/routes/Lab.tsx` (118) | Hidden engine console: raw JSON next to the rendered verdict | `POST /api/analyze` directly (`src/routes/Lab.tsx:26`) | Reachable in production (A9) |

Bottom nav (`src/components/BottomNav.tsx`) is present on the four primary screens
and absent on the Detect verdict screen and inside Shield, by design.

## 2. API map

All routes are in `worker/index.ts`. `app.use("/api/*")` (line 59) sets
`cache-control: no-store` on every API response — confirmed on the wire
(`201 POST /api/report cache-control=no-store`).

| Method | Path | Does | D1 | Notes |
|---|---|---|---|---|
| GET | `/api/health` (64) | `{ok, key_present, db_ready, model}` | `SELECT 1` | Reports key presence only, never the key |
| POST | `/api/analyze` (85) | Calls the engine, post-validates, returns the verdict | none | See limits below |
| POST | `/api/report` (231) | Inserts one row, returns `case_number` + `status` | `INSERT … RETURNING` on `reports` | 201 |
| GET | `/api/report/:case_number` (291) | Status only | `SELECT status FROM reports` | Contents are never read back |
| ALL | `/api`, `/api/*` (314–315) | JSON 404 | none | Stops a bad path falling through to `index.html` |

- Model: `ANTHROPIC_MODEL = claude-sonnet-5` (`wrangler.jsonc:37`), `ENGINE_THINKING = disabled`.
- `max_tokens`: 2000 text, 3000 with an image, 4000 if thinking is ever enabled (`worker/engine/analyze.ts:89`).
- Timeouts: 10 s text, 25 s image (`analyze.ts:7–8`); `maxRetries: 0`.
- Input cap: 2000 characters (`shared/types.ts:188`) → 413 `too_long`.
- Image: `image/jpeg|png|webp` only → 415 `bad_image`; 3 MB decoded → 413 `image_too_large`; client downscales past 2576 px.
- Rate limit: `ANALYZE_LIMITER`, 30 requests / 60 s per IP (`wrangler.jsonc:28–34`), with an in-isolate fallback.
- `reports` is the only table. Columns: id, created_at, source, category, verdict, confidence, impersonated_entity, channel, message_text, is_test, status. **No IP, user-agent or device column exists.** Case number is derived (`DR-2026-` + 5-digit id), not stored.

## 3. Detect, tested live — **BLOCKED**

Could not be run. The deployed URL is refused by the proxy (403 above) and there is
no API key on this machine by design. **The engine has never returned a real verdict
in this project's history** — `EVAL-REPORT.md` in the repo still says so in its first
line: *"Not run against a real engine yet."* The harness has only ever been exercised
against a mock.

What is in place and ready:

- Golden set: `content/eval-cases.json`, 22 cases — 16 `scam`, 6 `likely_safe`, 4 flagged `demo: true`.
- Harness: `scripts/eval.mjs` — writes `EVAL-REPORT.md` with per-case verdicts, latency percentiles, a Sonnet/Haiku comparison and the three weakest outputs quoted. Exits non-zero if a critical rule fails.
- The verbatim-quote property the brief asks to check per case is enforced in code, not left to the model: `worker/engine/postvalidate.ts` drops any flag whose quote is not in the input, and the behaviour is unit-tested (`drops a flag the engine invented`, `drops a second flag that overlaps the first`, and the digit-run tests that stop an invented phone number being stitched out of unrelated digits).

To run it from a machine with network (no key needed — it talks to the Worker):

```bash
npm run eval -- --target https://dara.abdalrhmankurdi12.workers.dev --compare
```

Until that has run, **no claim about the engine's accuracy or latency is supported by evidence**, and that is the single largest risk to Wednesday (A1).

## 4. Report, tested live — run against the production build, not the deployment

One report was submitted through the UI: `/shield` → `أبلغ بشكل مجهول`.

- `POST /api/report` → **201**, `cache-control: no-store`.
- D1 row landed. Case-number format: `DR-2026-00003` — `DR-` + year + 5-digit zero-padded id, derived from the row id, not stored in a column.
- `/reports` then listed `DR-2026-00003 / مُستلَم`, and Home showed it under `آخر بلاغ`.
- **Every string on the confirmation screen, checked against the honesty rules:**

| String | Verdict |
|---|---|
| `استُلم بلاغك في منصة درع.` | OK — names منصة درع, claims only receipt |
| `رقم البلاغ` / `DR-2026-00003` | OK |
| `احتفظ بهذا الرقم للمتابعة` | OK — no promise of who follows up |
| `الحالة: مُستلَم` | OK — the literal DB value |
| `نسخة تجريبية — البلاغات تُحفظ في منصة درع.` | OK — says pilot, says stored in منصة درع |
| `لا نطلب اسمك أو رقم هاتفك.` (Shield, above the button) | OK — literally true; the table has no such column |

No authority, no encryption claim, no "will be followed up". Nothing to fix in this
copy. The one gap is that the case number cannot be copied (A10).

**Test rows deleted** — `DELETE FROM reports` run against the local D1 after the
test; `SELECT COUNT(*)` returns 0. No row was created on the deployment, because
the deployment could not be reached.

## 5. Shield

All six steps render, in order, on the production build:

1. لا تدفع أي أموال — الدفع لا يضمن توقف المهاجم
2. لا تحذف أي رسائل أو صور أو مقاطع — فهي أدلة قانونية مهمة
3. وثق كل شيء قبل الحجب — لقطات شاشة لجميع الرسائل
4. قيّد حسابات وسائل التواصل الاجتماعي الخاصة بك مؤقتاً
5. احجب الشخص الذي يهددك على جميع المنصات
6. لا تشارك هذا الموقف علناً قبل الحصول على مشورة قانونية

`خروج سريع` works (full `location.replace`, so Back cannot return). The danger
check renders both branches.

Numbers, laws, penalties and statistics on this screen:

| Item | Where | `verified` | Renders in production? |
|---|---|---|---|
| Emergency number (911) | `contacts.emergency` | `false` | No — but the label `الطوارئ` renders with nothing after it (A4) |
| `الابتزاز الإلكتروني جريمة يعاقب عليها القانون الأردني.` | `content/v1-content.json:175`, `shield.reassurance` | **no field at all** | **Yes** (A5) |
| قانون الجرائم الإلكترونية رقم 17 لسنة 2023 + penalties | `content/v1-content.json:87,95`, `legal` | `false` | No — nothing references `legal` in the UI |
| Cybercrime Unit / Family Protection / bank fraud lines (+962 6 4655660, 110, 1700, 5008080, 06-5600000, 06-5007777) | `contacts` | `false` | No |

Seven contacts, two legal entries and three recover entries are `verified: false`.
The production gate (`src/lib/content.ts:11`, `SHOW_UNVERIFIED = import.meta.env.DEV`)
holds for everything that carries the flag. `shield.reassurance` does not carry one,
which is how the legal claim gets through.

## 6. Honesty sweep

`npm run honesty` passes: **no** hits for السلطات، الجهات المختصة، الجرائم الإلكترونية،
تم إرسال، تم إبلاغ، تم إخطار، مشفر، لا نحفظ، authorities, encrypted, Cybercrime in the
files it scans. A manual grep over `src/`, `worker/`, `shared/` and the rendered
content confirms it: the only hits in `content/v1-content.json` (lines 290–328) are
inside the `rewrite_required` block, which records v1's bad strings as problems and
never renders.

Two real findings, both about what the sweep does *not* cover:

| file:line | String | Fix |
|---|---|---|
| `content/v1-content.json:175` | `لست وحدك في هذا. الابتزاز الإلكتروني جريمة يعاقب عليها القانون الأردني.` — an unsourced legal claim, rendered in production, to a jury of government people | Add `"verified": false` (it then hides), or Abdelrahman checks the official text of Law 17/2023 and flips it to true with the article cited |
| `scripts/honesty-check.mjs:13` | The gate reads only `src/i18n/ar.json`, `src/i18n/en.json`, `worker/engine/prompt.ts`. It does not read `content/v1-content.json` — where the Shield copy actually lives — or the inline strings in `src/routes/*.tsx`. Its term list has no legal or statistical terms | Add those paths, and the terms قانون، جريمة، عقوبة، غرامة، سجن، مادة، %, ألف، آلاف |

## 7. Mobile QA (390×844, iPhone UA, production build)

| Check | Result |
|---|---|
| Viewport meta | `width=device-width, initial-scale=1, viewport-fit=cover` |
| Safe areas | Used — header, bottom nav and Shield's quick exit all read `env(safe-area-inset-*)` |
| Root | `<html lang="ar" dir="rtl">` on every route |
| `theme-color` | `#F4EFE6` |
| `format-detection` | `telephone=no` — stops iOS turning a scam message's numbers into call links |
| Fonts | **Self-hosted.** One family loaded: IBM Plex Sans Arabic. Zero external hosts requested on any route — no `fonts.googleapis.com`, no `gstatic` |
| Horizontal overflow | **Zero** on all six routes (`scrollWidth - clientWidth = 0`) |
| Tap targets under 44px | 32 instances across the app: Detect 14, Home/Reports/Protection 5 each, Shield 2, Lab 1 (A7) |
| PWA manifest | `name: درع DARA'`, `short_name: درع`, `display: standalone`, `lang: ar`, `dir: rtl`, theme and background `#F4EFE6`, `start_url: /`, icons 192 / 512 / 512-maskable |
| Offline shell | Works. Service worker controls the page, 18 precached entries, **0 of them under `/api/`**. With the network cut, Home re-loads fully and still shows the stored last report |
| Add-to-home-screen icon | **Missing on iOS** — no `apple-touch-icon` and no `apple-mobile-web-app-capable` in `index.html`; iOS ignores manifest icons and will use a screenshot of the page (A8) |

## 8. Console and network

Zero console errors, zero warnings, zero page errors, zero failed requests on all
six routes and through the report flow. No request to any host other than the app's
own origin, on any route.

## 9. Findings table

| # | Severity | What | Where | One-line fix |
|---|---|---|---|---|
| A1 | DEMO-BREAKING | The engine has never produced a real verdict. No eval has ever run against a deployment; `EVAL-REPORT.md` says so in line 1 | `EVAL-REPORT.md`, `content/eval-cases.json` | Run `npm run eval -- --target https://dara.abdalrhmankurdi12.workers.dev --compare` from a machine with network and read the table before Wednesday |
| A2 | DEMO-BREAKING | The venue-network fallback is dead: `cached-verdicts.json` holds 0 verdicts, and with no cached entry `analyze()` skips the slow race entirely, so a slow check just waits out the Worker's 10 s timeout and shows an error | `src/demo/cached-verdicts.json`, `src/lib/api.ts:93` | Run `npm run cache-demo -- --target <deployed>` after the next deploy, and raise the threshold to 12 s |
| A3 | DEMO-BREAKING | The demo's headline message — the fake GAM parking fine from slide 2 — has no text. Its `text` is still `REPLACE_WITH_EXACT_SMS_TEXT`, so it is skipped by both the eval harness and `demo:stage`, and `reference/gam-fake-fine.png` does not exist either | `content/eval-cases.json` (`gam_parking_fine`) | Abdelrahman pastes the exact SMS text; then re-stage and re-cache |
| A4 | DEMO-BREAKING | Shield → `نعم` (in immediate danger) says `اتصل بالطوارئ الآن.` and then renders the bare label `الطوارئ` with no number, because the contact is `verified: false`. The app's most urgent branch looks broken | `content/v1-content.json` (`contacts.emergency`), `src/routes/Shield.tsx` | Either Abdelrahman verifies 911 against an official source and flips the flag, or the copy stops promising a number it will not show |
| A5 | DEMO-BREAKING | An unsourced legal claim renders in production: `الابتزاز الإلكتروني جريمة يعاقب عليها القانون الأردني.` It carries no `verified` field, so the production gate never sees it | `content/v1-content.json:175` | Add `"verified": false`, or cite Law 17/2023 after checking the official text |
| A6 | DEMO-BREAKING | The honesty gate passed while A5 shipped: it reads 3 files, not the content file the Shield copy lives in, and has no legal or statistical terms | `scripts/honesty-check.mjs:13` | Add `content/v1-content.json` and `src/routes/*.tsx`, and the legal/statistic terms. (Severity is a judgement call — it is the control that is supposed to stop exactly the class of claim a jury probes) |
| A7 | VISIBLE | 32 tap targets under 44px, worst on Detect: `لصق` 26×23, `صورة` 28×23, channel chips 26px tall, `رجوع` 34×31; the four nav tabs are 98×40 on every screen and `English` is 52×27 | `src/routes/Detect.tsx`, `src/components/BottomNav.tsx`, `src/components/Layout.tsx` | Pad to a 44px minimum hit area without changing the visual size |
| A8 | VISIBLE | Adding to the iPhone home screen uses a screenshot, not the mark — no `apple-touch-icon`, no `apple-mobile-web-app-capable` | `index.html`, `public/icons/` | Add a 180×180 apple-touch-icon and the two meta tags |
| A9 | VISIBLE | `/lab` is reachable in production and renders raw engine JSON. Nothing links to it, but the URL works | `src/lib/router.ts:19`, `src/App.tsx` | Gate the route on `import.meta.env.DEV` |
| A10 | VISIBLE | The case number cannot be copied on the confirmation screen — the only buttons are `رجوع`, `خروج سريع`, `إغلاق` | `src/routes/Shield.tsx`, `src/routes/Detect.tsx` | Add a copy affordance next to the number (Phase 1 requires it) |
| A11 | VISIBLE | The slow-fallback threshold is 8 s; the brief says 12 s | `src/lib/api.ts:13` | `SLOW_MS = 12_000` |
| A12 | COSMETIC | Shield files a report on one tap with no preview of what is sent. A judge may ask what just left the phone | `src/routes/Shield.tsx` | Show the two fields that are sent, above the button |
| A13 | COSMETIC | Every route shares one `<title>`; no `<meta name="description">` | `index.html` | Set a per-route title on navigate |
| A14 | COSMETIC | `reference/deck.pdf` is absent, so the type direction was defaulted to IBM Plex Sans Arabic rather than read from the deck; `reference/` holds only the brand mark | `reference/` | Phase 2 uses Noto Kufi Arabic + IBM Plex Sans Arabic per the brief unless the deck says otherwise |

**Counts — DEMO-BREAKING 6, VISIBLE 5, COSMETIC 3. Total 14.**

Not a finding, recorded for completeness: the brand mark, the four-destination
architecture, RTL, the no-store headers, the absence of any IP/user-agent column,
the 2000-character cap, the 30/60 s rate limit and the image type and size
validation were all checked and are as specified.

---

# Phase 1 results

Scope: every DEMO-BREAKING and VISIBLE finding above. One commit per item.

| # | Severity | State | Commit |
|---|---|---|---|
| A1 | DEMO-BREAKING | Engine now measurable — see the eval below | `d53f9a6` |
| A2 | DEMO-BREAKING | Fixed | `1fe1199` |
| A3 | DEMO-BREAKING | Stand-in shipped; the real SMS text is still Abdelrahman's to supply | `34a73cd` |
| A4 | DEMO-BREAKING | Fixed | `ffedc63` |
| A5 | DEMO-BREAKING | Fixed | `ffedc63` |
| A6 | DEMO-BREAKING | Fixed, and it found a second ungated claim on its first run | `86c4325` |
| A7 | VISIBLE | Fixed | `49b16a1` |
| A8 | VISIBLE | Fixed | `fd6055b` |
| A9 | VISIBLE | Fixed | `489963d` |
| A10 | VISIBLE | Fixed | `49b16a1` |
| A11 | VISIBLE | Fixed | `1fe1199` |
| A12–A14 | COSMETIC | Untouched, by the phase's scope | — |

## What each fix actually does

- **A4** — an unverified contact now hides its label as well as its number, in
  `src/lib/content.ts`. Tapping `نعم` used to print `الطوارئ` with nothing after it.
- **A5** — the reassurance line is split. `لست وحدك في هذا.` still renders;
  `الابتزاز الإلكتروني جريمة يعاقب عليها القانون الأردني.` moved to a
  `verified: false` field and renders only in dev, with the VERIFY tag.
- **A6** — the honesty gate reads every route and component plus the content file,
  skipping subtrees marked `verified: false` because they cannot reach production.
  Run against the pre-fix commit it reports 6 problems including both halves of A5;
  against this one, none. Its first run found `recover_stretch.money_sent`, which
  carries an unverified Arab Bank number and the claim that the Cybercrime Unit
  recovers funds across borders — recorded in its own note, but with no flag, so
  Phase 3 would have shipped it. Flagged now.
- **A2/A11** — the slow mark is 12 s, and a staged message checked live once leaves
  its real verdict on that device, so the same message survives a bad network later
  and is tagged `نتيجة محفوظة`. Only the four staged messages are ever written down;
  anything a person pastes is not. The file cache still works and still wins.
- **A3** — `parking_fine_reconstructed` joins the golden set, marked synthetic and
  marked in its own note as a reconstruction. `gam_parking_fine` keeps its slot for
  the real text. Staged messages: 3 → 4.
- **A7** — the quiet text buttons keep their size and gain a 44px hit area from a
  pseudo-element; the nav tabs, the Shield quick exit and the channel chips take a
  real min-height. **The chips are the one visual change in this phase.**
- **A8** — a 180×180 `apple-touch-icon` rendered from the same mark, plus the iOS
  standalone meta tags.
- **A9** — `/lab` resolves to Home unless the build is a development one.
- **A10** — a copy button on the case number, on both confirmation screens, falling
  back to selecting the number when the clipboard is refused.

## Re-run of the Phase 0 checks, before and after

Same method as Phase 0: production build, served by the Worker runtime, Chromium at
390×844 with an iPhone user agent.

| Check | Before | After |
|---|---|---|
| Tap targets under 44px of reach | 32 | **0** — every remaining small control answers `elementFromPoint` 21px out in all four directions |
| Horizontal overflow, 6 routes | 0 | 0 |
| Console errors / warnings / failed requests | 0 | 0 |
| External hosts requested | 0 | 0 |
| `apple-touch-icon` | absent | `/icons/apple-touch-icon-180.png` |
| `/lab` in production | renders raw engine JSON | renders Home |
| Shield `نعم` | `الطوارئ` with no number | the sentence alone, no dangling label |
| Unsourced legal claim in Shield | renders | gone from production, VERIFY-tagged in dev |
| Case number | read-only | copied; clipboard held `DR-2026-00004`, label turned `تم النسخ` |
| `npm run verify` | typecheck + 69 tests + honesty + build | typecheck + **77 tests** + a stricter honesty gate + build |
| Service worker precache | 18 entries, 0 under `/api/` | 23 entries, 0 under `/api/` |

Report submitted again end to end through Shield: `201`, row landed, case
`DR-2026-00004`, `cache-control: no-store`. Row deleted after; `SELECT COUNT(*)`
returns 0.

## The eval, run at last — and what it found

The audit could not reach the deployment and no machine that could reach it
could run the harness. A CI job can do both, so A1 was fixed by putting the
harness on the right side of that wall. It ran three times today.

**Run 1** (`34758142635`) answered the question the audit left open, and the
answer is worse than "unmeasured":

| model | cases | critical failures | text p50 | quotes matched |
|---|---|---|---|---|
| claude-sonnet-5 | 22 | **22** | 11 ms | 100% (vacuously — nothing was returned) |

Every single case came back in 9–19 ms with:

```json
{ "error": "server_error", "message": "engine not configured" }
```

`worker/index.ts:133` returns exactly that, and only that, when
`c.env.ANTHROPIC_API_KEY` is falsy. Run 3 (`34758338926`) confirms it from the
deployment's own health endpoint:

```
HEALTH: {"ok":true,"key_present":false,"db_ready":true,"model":"claude-sonnet-5"}
```

### A15 — DEMO-BREAKING — the deployed Worker has no API key

**Detect does not work in production right now, and has not since it was
deployed.** Every check returns a 503 the UI shows as a generic error. This was
invisible to every check the audit could run locally, because a local build
reads `.dev.vars` and reports `key_present: true` from a key that is not the
deployment's.

- The deployment is up, and `db_ready: true` — **Report works in production**. D1 is bound and migrated.
- `ANTHROPIC_MODEL` reads `claude-sonnet-5` on the deployment, as configured.
- The fix is not in this repository and cannot be: the key is a Worker secret.
  Cloudflare dashboard → Workers & Pages → `dara` → Settings → Variables and
  Secrets → add `ANTHROPIC_API_KEY` as a **Secret**, then redeploy. It must
  never be pasted into a chat or written to a file here.
- The eval re-runs itself on the next push and will report the real verdict
  table the moment the key exists.

`EVAL-REPORT.md` in the repo records this run. The engine's accuracy and
latency remain **unmeasured** — not because the harness does not work, but
because there is nothing behind the endpoint to measure.

### Still open after Phase 1

| # | Severity | What | Whose |
|---|---|---|---|
| A15 | DEMO-BREAKING | No `ANTHROPIC_API_KEY` on the deployed Worker; Detect 503s | Abdelrahman — dashboard only |
| A1 | DEMO-BREAKING | Engine accuracy and latency still unmeasured | Unblocks itself once A15 is fixed |
| A3 | DEMO-BREAKING (partial) | The real GAM parking-fine SMS text | Abdelrahman |
| A4 | — | 911 stays hidden until someone verifies it against an official source | Abdelrahman, one flag |
| A5 | — | The cybercrime-law sentence stays hidden until the article is cited | Abdelrahman, one flag |
| A12–A14 | COSMETIC | Out of Phase 1's scope | Phase 2 or later |

One more thing worth saying plainly: these fixes are pushed to
`claude/kind-cray-vyr1v6`. Whether they are **deployed** depends on which branch
Cloudflare Workers Builds is watching. If it only builds the default branch, the
live site still has none of them.

---

# Phase 2 results — the facelift

Same routes, same API. The palette, the type, the scale and the layout are the
deck's; the copy changed only where the deck specifies a layout string
(`جارٍ الفحص…`, `ماذا أفعل الآن؟`, `مشبوه`).

## Tokens

Six, in `src/styles/theme.css`, and nothing else appears anywhere in the app:

```
--paper #F4EFE6   --paper-2 #EDE6D8   --rule #D9D2C4
--ink   #111111   --ink-2   #5C574E   --threat #C40B29
```

The old opacity ramp (`ink-70/55/20/12`) is gone — 64 usages swept to `ink-2`
and `rule`. A grep for every six-digit colour in `src/` returns exactly those
six. No green, no blue, no gradient, no shadow, no rounded corner anywhere
(`grep rounded` returns nothing), and no emoji in any UI string.

Red now appears in four places only: the danger verdict word and its rule, the
marks inside a flagged message, the Shield entry, and Shield's top rule and step
numerals. The report buttons became ink.

## Type

- Headlines, verdicts and case numbers: **Noto Kufi Arabic** 600/700.
- Body, forms, lists: **IBM Plex Sans Arabic** 400/500/600/700.
- Both self-hosted and precached. The browser reports exactly two loaded
  families and **zero external hosts** on every route.
- Scale: h1 28, h2 22, body 16/1.6, meta 13.
- Arabic-Indic numerals (٠١ … ٠٦) on section numbers, Shield steps, and the
  marks inside a flagged message. Case numbers, dates, percentages and the
  character counter stay Latin.

## Layout

- One column, `max-width: 480px`, paper bleeding to the edges, safe areas kept.
- **Home** — mark top-right, `درعك الرقمي ضد الاحتيال والابتزاز` under it, then
  three numbered rows separated by hairlines: كشف، إبلاغ، درع الابتزاز. حماية،
  توعية and تعافي are absent until Phase 3; there is no "coming soon".
- **Detect** — textarea on `--paper-2` with a `--rule` border, counter, one
  full-width ink button. Loading is a thin ink line under the header that fills
  over 12 s and stops at 92%, with `جارٍ الفحص…` beside it. No spinner.
- **Verdict** — the word large in Kufi (`احتيال` red under a red rule, `مشبوه`
  ink on `--paper-2` with a drawn warning mark, `تبدو سليمة` ink with a drawn
  check), one-sentence summary, the message quoted on `--paper-2` with each
  flagged span underlined 2px in red over a 12% red wash and numbered, then
  `لماذا؟` and `ماذا أفعل الآن؟`. Footer: `مدعوم بتقنية Claude`, with the
  `نتيجة محفوظة` tag beside it when the result came from the saved cache.
- **Report** — the one field on `--paper-2`, ink submit. Confirmation: the case
  number large in Kufi with the copy button from Phase 1, then the pilot line.
- **Shield** — a 2px threat rule across the top, steps as numbered editorial
  sections with red numerals, everything else ink.
- Motion: one 150ms opacity fade, and the loading line. Both are disabled under
  `prefers-reduced-motion`.

## Mobile QA, re-run at 390×844

| Check | Result |
|---|---|
| Horizontal overflow, 6 routes | 0 |
| Console errors / warnings / page errors / failed requests | 0 |
| External hosts requested | 0 |
| Fonts loaded | IBM Plex Sans Arabic, Noto Kufi Arabic — both local |
| Tap targets | every control still answers `elementFromPoint` 21px out in all four directions |
| `apple-touch-icon` / manifest / `dir=rtl` / `lang=ar` / safe areas | unchanged and correct |
| Service worker precache | 36 entries, 1364 KiB, still 0 under `/api/` |
| `npm run verify` | typecheck + 77 tests + honesty + build, all green |

## Screenshots

`docs/screens/phase2/` — 390×844, at 2× :

- `01-home.png`
- `02-detect-empty.png`
- `03-detect-result-danger.png`
- `04-report-form.png`
- `05-report-confirmation.png`
- `06-shield.png`

**`03` is the one screenshot that is not the live engine.** The deployed Worker
has no key (A15) and there is no key here, so that screen was photographed
against a stand-in response shaped exactly like the engine's output, to review
the design. Every other screenshot is the real app doing the real thing —
`05` is a real report, a real row in D1 and a real case number, deleted after.

## One thing found while shooting

The quoted-message renderer walks the text with a single cursor and assumed the
flags arrive in document order. `worker/engine/postvalidate.ts:165` does sort
them, so the deployed path was never wrong — but a verdict that reached the
screen any other way would have duplicated half the message on the one screen
the whole demo is built around. It now sorts defensively before rendering.

---

# Phase 3 results — Protect, Educate, Recover

Three reviewed content screens. No AI, no forms, no external calls, same design
system as Phase 2. Content lives in `content/layers/{protect,educate,recover}.json`
and is gated by `src/lib/layers.ts` on the same rule as the rest of the app: a
section marked `verified: false` does not render in a production build, and
renders in dev with the VERIFY tag.

| Layer | Route | Sections | Hidden in production |
|---|---|---|---|
| حماية | `/protection` | 8 | 0 |
| توعية | `/educate` | 6 | 0 |
| تعافي | `/recover` | 7 | **1** |

## Every `verified: false` item, and what it needs

| Where | Text | What it would take |
|---|---|---|
| `content/layers/recover.json` → `official_report` | «قدّم بلاغًا لدى الجهة المختصة واطلب رقمًا مرجعيًا للقضية، واحتفظ به مع الأدلة التي وثّقتها.» | Confirm from an official source which body takes the report, the correct name for it, and what a person actually receives. Then flip to `true`. |

Still hidden from the earlier phases, unchanged:

| Where | What | What it would take |
|---|---|---|
| `content/v1-content.json` → `contacts` (7) | 911, 110, +962 6 4655660, 1700, 5008080, 06-5600000, 06-5007777 | Check each against an official source. 911 alone would put a number back into Shield's `نعم` branch. |
| `content/v1-content.json` → `legal` (2) | The cybercrime law's number and its penalties | An official text, with the article cited |
| `content/v1-content.json` → `shield.legal_note` | «الابتزاز الإلكتروني جريمة يعاقب عليها القانون الأردني.» | Same |
| `content/v1-content.json` → `recover_stretch.money_sent` | An unverified bank number and a claim about cross-border recovery | Same — or leave it hidden; `/recover` now covers this ground without naming anyone |

## What the content deliberately does not do

No statistics anywhere in the three files. No phone numbers. No invented URLs —
the government-domain anatomy describes the check rather than printing a fake
domain. No institution is named in anything that renders. The tone is second
person, short sentences, no fear language.

## The honesty gate now reads these files too

`scripts/honesty-check.mjs` walks all four content files — 143 renderable
strings — skipping `verified: false` subtrees, and fails the build on any
renderable string that states a law, a penalty, a number, or names an authority
without a flag. Flipping `official_report` to `true` makes it fail, which is
the check working:

```
content/layers/recover.json sections[5].body  «الجهة المختصة»  قدّم بلاغًا لدى الجهة المختصة…
```

## QA, re-run

| Check | Result |
|---|---|
| Horizontal overflow, all routes incl. the three new ones | 0 |
| Console errors / warnings / failed requests | 0 |
| External hosts | 0 |
| `VERIFY` visible in the production build | none |
| `npm run verify` | typecheck + 77 tests + honesty + build, green |

## Screenshots

`docs/screens/phase3/` — 390 wide, 2×, full page:

- `01-home.png` — all six layers, ٠١ … ٠٦
- `02-protect.png`
- `03-educate.png`
- `04-recover.png`

## Two changes outside the content

- The staged demo set went from 4 to 6: `bank_otp_call` (a scam with no link at
  all) and `legit_otp` (the control, same subject, opposite verdict). The demo
  needed a legitimate message, and `DEMO-RUNBOOK.md` is built around those three.
- `src/components/RecoverPaths.tsx` is deleted. It was a dev-only listing of v1's
  unreviewed recovery text; `/recover` replaces it with content that has been
  written and checked.
