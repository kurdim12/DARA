# INVENTORY.md — what exists before the rebuild

Read-only pass. No code changed.

- Date: Sun 13 Sep 2026 · Commit `4038670` on `claude/kind-cray-vyr1v6`, tree clean
- `CLAUDE.md` (109 lines) and `BUILD.md` (377 lines) are both present.
- `npm run verify` is green: typecheck, 77 tests in 7 files, honesty gate, build.

---

## 1. Routes

Client-side only (`src/lib/router.ts`, `history.pushState`). The Worker serves
`index.html` for every non-`/api` path.

| Path | File | Lines | What it is today |
|---|---|---|---|
| `/` | `routes/Home.tsx` | 109 | Brush-stroke mark, one tagline, an editorial numbered list of six layers, last-report block |
| `/detect` | `routes/Detect.tsx` | 590 | One universal textarea + image upload, channel chips, verdict screen, report sheet, confirmation — four stages in one file |
| `/reports` | `routes/Reports.tsx` | 102 | Case numbers stored on this device, each with a live status lookup |
| `/protection` | `routes/Protection.tsx` | 43 | Shield entry + the 8-section حماية layer |
| `/educate` | `routes/Educate.tsx` | 78 | 6 scam anatomies |
| `/recover` | `routes/Recover.tsx` | 33 | 7-section تعافي layer (1 hidden in production) |
| `/shield` | `routes/Shield.tsx` | 191 | درع الابتزاز: danger check, 6 steps, anonymous report, quick exit |
| `/lab` | `routes/Lab.tsx` | 118 | Engine console. Dev builds only since A9 |

**Navigation today:** a 4-tab bottom nav (الرئيسية / كشف / بلاغاتي / حماية).
The new brief specifies **5 tabs** (Home, Scan, Report, Recover, Shield) — see §9.

## 2. Components and libraries

| File | Lines | Fate |
|---|---|---|
| `components/Layout.tsx` | 96 | **Rewrite.** `Page`, `LangToggle`, `PrimaryButton`, `QuietButton`, `SectionTitle` — the shapes survive, the tokens and the header do not |
| `components/BottomNav.tsx` | 58 | **Rewrite.** 4 text-only tabs → 5 tabs with lucide icons |
| `components/HighlightedMessage.tsx` | 53 | **Keep.** Offset walk, order-safe sort, never renders a link. Only the colours change |
| `components/VerdictBand.tsx` | 68 | **Rewrite.** 3 states → 4 levels |
| `components/CaseNumber.tsx` | 56 | **Keep**, restyle. Copy button with a selection fallback |
| `components/LayerSections.tsx` | 44 | **Keep** for Phase 3 content screens, restyle |
| `components/Mark.tsx` | 71 | **Replace** on Home with the blue shield-and-D logo; keep the file, the long-press demo tray hangs off it |
| `components/DemoTray.tsx` | 98 | **Keep.** Hidden staged-message tray, long-press the logo |
| `lib/api.ts` | 137 | **Keep.** `analyze()` with the 12s slow mark and cached fallback, `sendReport()` |
| `lib/demo.ts` | 93 | **Keep.** Staged messages + saved verdicts, file cache and device cache |
| `lib/storage.ts` | 59 | **Keep.** Case numbers and the rehearsal flag, device-only |
| `lib/layers.ts` | 57 | **Keep.** `verified` gating for the three content layers |
| `lib/content.ts` | 77 | **Keep.** Gating for v1 contacts and Shield content |
| `lib/image.ts` | 90 | **Keep.** Client-side downscale to 2576px |
| `lib/router.ts` | 62 | **Extend.** Add `scan`, and the Protect / Learn routes |
| `lib/numerals.ts` | 24 | **Probably drop.** Arabic-Indic section numerals are a deck idea, not a submitted-app idea |
| `lib/status.ts` | 11 | **Keep** |
| `i18n/index.tsx` | 75 | **Keep**, two changes — see §7 |

## 3. API endpoints

All in `worker/index.ts` (317 lines). `app.use("/api/*")` sets
`cache-control: no-store` on every response.

| Method | Path | Body / params | Returns |
|---|---|---|---|
| GET | `/api/health` | — | `{ok, key_present, db_ready, model}` |
| POST | `/api/analyze` | `{text, lang, channel?, image?}` | the full verdict object |
| POST | `/api/report` | `{source, category, verdict?, confidence?, impersonated_entity?, channel?, message_text?, is_test?}` | `201 {case_number, status}` |
| GET | `/api/report/:case_number` | — | `{status}` only |
| ALL | `/api`, `/api/*` | — | JSON 404 |

Limits, unchanged by this rebuild: 2000 characters; images jpeg/png/webp under
3 MB; 30 requests per 60s per IP; `max_tokens` 2000 text / 3000 image; 10s text
and 25s image deadlines; `maxRetries: 0`.

## 4. D1

One table, `reports`, from `migrations/`:

```
id, created_at, source, category, verdict, confidence,
impersonated_entity, channel, message_text, is_test, status
```

No IP, user-agent or device column exists. The case number is derived
(`DR-2026-` + 5-digit id), never stored.

## 5. Content files

| File | What |
|---|---|
| `content/v1-content.json` | Ported v1 content. 7 contacts, 2 legal entries, Shield copy, stretch text. Everything numeric or legal is `verified: false` |
| `content/eval-cases.json` | The golden set: 23 cases, 6 staged for the demo |
| `content/layers/protect.json` | 8 sections, all verified |
| `content/layers/educate.json` | 6 anatomies, all verified |
| `content/layers/recover.json` | 7 sections, 1 unverified and therefore hidden |
| `content/verified-threat-patterns.json` | Empty `patterns: []` — matching ships dormant, no verified corpus exists |

**The new brief needs seven files that do not exist yet:** `content/verified.json`,
`content/threats.json`, `content/community-seed.json`, `content/shield/{situation}.json`,
`content/recover/{situation}.json`, `content/protect.json`, `content/quiz.json`.

## 6. Eval harness

`scripts/eval.mjs` (329 lines) runs the golden set against a deployed URL and
writes `EVAL-REPORT.md`. It posts `{text, lang, channel}` to `/api/analyze`, so
adding `type` is additive and does not break it. It runs in CI
(`.github/workflows/eval.yml`) because no machine that can run the harness can
also reach the deployment.

Supporting scripts: `cache-demo.mjs`, `stage-demo.mjs`, `honesty-check.mjs`
(gates the build), `check-config.mjs`, `brand.mjs`, `png.mjs`.

## 7. i18n status

**Good.** 175 keys in `src/i18n/ar.json` and 175 in `src/i18n/en.json`, no key
missing on either side, and zero English values that are still the Arabic
string. Three hardcoded strings exist and all three are dev-only: `VERIFY`,
`demo: true`, `no saved result`.

Two changes the new brief requires:

- **Default language is Arabic today**, set in `index.html` as
  `<html lang="ar" dir="rtl">`. The brief wants English by default.
- **The choice is persisted in `localStorage` (`dara.lang`)**. The brief wants
  session-only memory.

The three Phase 3 content layers are Arabic-only by the previous brief's
instruction, so an English reader sees Arabic body text on Protect, Educate and
Recover. Under "every user-facing string in both languages" those three files
now need English too.

## 8. The two API confirmations the brief asks for

### `type` on the analyzer — **confirmed, one-line change**

`buildUserContent(text, lang, channel, options)` in `worker/engine/prompt.ts:119`
builds a plain list of lines and already does `if (channel) lines.push(...)`.
Adding `type` is the same shape:

- `worker/index.ts:95` — parse `type` against a new `ANALYSIS_TYPES` list
  (`message | link | call | job | website`), ignore anything else.
- `worker/engine/analyze.ts` — pass it through to `buildUserContent`.
- `worker/engine/prompt.ts:126` — `if (type) lines.push(\`TYPE: ${type}\`)`.

It is a hint only: the engine already decides what it is looking at, and nothing
in post-validation or the tool schema keys off it. `test/request-shape.test.ts`
asserts the request body and will need the new line added.

`channel` and `type` are **not** the same field and both should survive:
`channel` is how it reached you (sms / whatsapp / call / email / social / other),
`type` is what it is. The Scan chips set `type`.

### Report columns — **confirmed, needs one migration**

None of the four columns exists today. All four are plain additive columns:

```sql
ALTER TABLE reports ADD COLUMN threat_type        TEXT;
ALTER TABLE reports ADD COLUMN relevant_authority TEXT;
ALTER TABLE reports ADD COLUMN anonymous          INTEGER NOT NULL DEFAULT 1;
ALTER TABLE reports ADD COLUMN contact            TEXT;
```

Two more are needed for the Community Reports section, which the brief describes
but does not list columns for:

```sql
ALTER TABLE reports ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;
ALTER TABLE reports ADD COLUMN is_seed   INTEGER NOT NULL DEFAULT 0;
```

`wrangler d1 migrations apply dara --remote` runs in `deploy:ci`, so a new
numbered file in `migrations/` ships with the next deploy. Existing rows take
the defaults; nothing needs backfilling.

## 9. What is reusable, and what gets replaced

**Reusable as-is (the whole backend and most of the plumbing):** the Worker and
all five routes, the engine, post-validation, the URL inspector, the threat
matcher, D1, the rate limiter, the eval harness, the honesty gate, the PWA and
its offline shell, the cached-fallback path with its 12s mark and saved-result
tag, the case-number copy control, the `verified` gating in `lib/content.ts` and
`lib/layers.ts`, the staged demo tray, and the image pipeline.

**Replaced:** the entire visual system and the shell. Specifically —

| Today (Phase 2, the deck) | The submitted app |
|---|---|
| Cream `#F4EFE6`, ink `#111111`, one red, light only | Light **and** dark, blue primary, success green for Safe |
| Noto Kufi Arabic + IBM Plex Sans Arabic | Inter (EN) + IBM Plex Sans Arabic (AR) |
| No icons anywhere, by rule | lucide outline icons, 20px, in tiles and nav |
| Square corners, hairline rules, no shadows | 14px cards, 999px pills, 1px borders, no shadows |
| 4-tab text-only bottom nav | 5-tab nav with icons |
| Arabic default, RTL | English default, toggle to Arabic |
| Brush-stroke درع mark | Blue rounded-square shield with a white D, "DARA'", درع tucked under the apostrophe |
| 3 verdict states (scam / suspicious / likely_safe) | 4 levels (High / Medium / Low / Safe) |

**New screens with no equivalent today:** Scan (as its own tab), the Result
screen, the full Report form, Community Reports, the Shield situation picker,
the Recovery situation picker, Protect, Learn, and the "all known threats" list.

---

## Things I need a decision on, or that need saying out loud

1. **This reverses parts of `CLAUDE.md`.** That file says paper/ink/one red,
   "no green, no blue, no gradients", Arabic-first with `dir="rtl"` by default,
   and no decorative icons. The new brief requires blue, green, icons and an
   English default. The submitted app is the reference, so the brief wins — but
   `CLAUDE.md` should be updated to match, or the next person reading it will
   "fix" the app back.
2. **Three verdicts, four levels.** The engine returns `scam | suspicious |
   likely_safe` plus a confidence. The obvious mapping is scam → High,
   suspicious → Medium, and likely_safe split on confidence — but the split
   point is a judgement call that changes what a jury sees. My default, unless
   you say otherwise: `likely_safe` with confidence ≥ 70 → **Safe**, below that
   → **Low risk**.
3. **Community Reports is a new risk surface.** It shows free text one person
   typed to every other person who opens the app. It needs the `is_public` flag,
   the same never-render-as-a-link rule the analyzed message has, and a decision
   about what happens if someone types something abusive during the demo. My
   default: only `is_seed` rows and rows explicitly marked public render, and
   nothing a visitor submits is public unless you flip it.
4. **The `contact` column is the first place this app can hold personal data.**
   It is opt-in and only when someone turns anonymity off, which is fine — but
   no copy anywhere may then say personal information is never stored. The
   substitution table already handles this; it just has to stay handled.
5. **Live threat counts need a new endpoint.** "12 reports on DARA'" means a
   public aggregate — `GET /api/threats` returning counts per category. It reads
   no report contents.
6. **The quiz was previously cut.** `CLAUDE.md` lists quizzes under CUT; Phase 3
   brings one back. Fine, but it is a scope change, not an oversight.
7. **I cannot deploy.** Cloudflare Workers Builds deploys on push; I can push.
   And the deployed Worker still has **no `ANTHROPIC_API_KEY`** — `key_present`
   is `false`, so every analyze call returns 503. Until you set that secret, no
   amount of frontend work makes Scan work on the live URL.
