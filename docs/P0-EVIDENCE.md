# P0 — evidence

## Gate: is this checkout what production serves?

`deploy-check` run `35181660057`, 2026-09-17 04:22 UTC:

```
live:          196c9b0
this commit:   196c9b0
commits since: 0
VERDICT: CURRENT — the live site is serving this exact commit
```

**Yes.** Zaid's 15 Sep mismatch predates the OCR work landing; it is not
reproducible now.

---

## P0-1 — link scans

### The model, and where it is configured

`ANTHROPIC_MODEL` = **`openai/gpt-6-astra`**, set in `wrangler.jsonc:48`.
Reached through `ANTHROPIC_BASE_URL` = `https://openrouter.ai/api` (line 47).
Fallback chain `ANTHROPIC_MODEL_FALLBACKS` = `anthropic/claude-opus-5,openai/gpt-5.4`
(line 54).

**The model is unchanged.** A faster primary is proposed below, not applied.

### Baseline — before the fix (run `35181790545`)

Nothing persisted latencies, so "the last 20 measured" did not exist as a
record. These were measured.

| # | Link | HTTP | wall ms | engine latency_ms | verdict |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | `amanat-amman-pay.com` | 200 | 8470 | 8131 | suspicious |
| 2 | `arabbank-secure.verify-now.com` | 200 | 9734 | 9451 | suspicious |
| 3 | `jo-gov-services.com` | 200 | 9475 | 9153 | suspicious |
| 4 | `zain-jo-offers.net` | 200 | 9549 | 9194 | suspicious |
| 5 | `orange-jo.support-verify.com` | 200 | 7521 | 7201 | suspicious |
| 6 | `umniah-rewards.co` | 200 | 8955 | 8621 | suspicious |
| 7 | `www.jordanpost-delivery.info` | 200 | 9524 | 9247 | suspicious |
| 8 | `cliq-jo-transfer.com` | **504** | 10148 | — | **timeout** |
| 9 | `moi-jo-update.com` | 200 | 7709 | 7431 | suspicious |
| 10 | `e-fawateercom-pay.net` | 200 | 9347 | 9071 | suspicious |

**9/10 useful.** engine latency min 7201 / median 9071 / max 9451, against a
**10,000 ms** wall. The slowest cleared it by **549 ms**. That is not a
timeout, it is a coin toss — and #8 lost it.

Zaid measured 0/4 on 16 Sep. Same mechanism, worse moment.

### After the fix (run `35182467977`)

| # | Link | HTTP | wall ms | engine latency_ms | verdict |
| ---: | --- | ---: | ---: | ---: | --- |
| 1 | `amanat-amman-pay.com` | 200 | 10702 | **10207** | suspicious |
| 2 | `arabbank-secure.verify-now.com` | 200 | 7237 | 6804 | suspicious |
| 3 | `jo-gov-services.com` | 200 | 9139 | 8615 | suspicious |
| 4 | `zain-jo-offers.net` | 200 | 8100 | 7666 | suspicious |
| 5 | `orange-jo.support-verify.com` | 200 | 8558 | 8045 | suspicious |
| 6 | `umniah-rewards.co` | 200 | 9504 | 9072 | suspicious |
| 7 | `www.jordanpost-delivery.info` | 200 | 8483 | 7987 | suspicious |
| 8 | `cliq-jo-transfer.com` | 200 | 11242 | **10723** | suspicious |
| 9 | `moi-jo-update.com` | 200 | 8254 | 7834 | suspicious |
| 10 | `e-fawateercom-pay.net` | 200 | 10610 | **10154** | suspicious |

**10/10 useful. Zero dead ends.**

This run was *slower* than the baseline, which makes it the better proof:
**three of the ten (10,207 / 10,723 / 10,154 ms) exceeded the old 10 s wall**
and would have been 504s. #8 is the one that actually failed before.

### Cache (run `35182607622`, same ten links immediately after)

| | wall ms |
| --- | --- |
| uncached | 7237 – 11242 |
| cached | **226 – 318** |

A ~35× drop. `latency_ms` still reports the original engine time each verdict
was computed with (10207, 6804, …), because that is what was stored — the
cache returns the answer, not a new measurement. Whole run: 15 s against 90 s.

D1, not KV: no KV namespace is bound and creating one needs Cloudflare
credentials this build does not have. `scan_cache` keys on a SHA-256 of the
normalized input, so the pasted message is never stored.

### Proposal for Abdelrahman — not applied

`openai/gpt-6-astra` runs 6.8–10.7 s. Inside a 25 s wall that is safe, but it
is still a long wait on a stage. A faster primary is worth testing:

- **`anthropic/claude-haiku-4.5`** — $1.00/M in, $5.00/M out, already proven on
  this app as the OCR fallback, and it answered image transcriptions in ~2.1 s.
- **`anthropic/claude-sonnet-5`** — $2.00/M in, $10.00/M out.

Both support the forced tool call this engine requires. `ANTHROPIC_MODEL_CANDIDATES`
already gates what the eval may compare, so the way to settle it is
`npm run eval -- --compare`, on verdict accuracy and surviving Arabic quotes —
not on latency alone. **Your call; nothing changed.**

### Build

```
tsc --noEmit: clean
23 test files, 220 tests passed
vite build: dist/client/assets/index-*.js 493.28 kB (gzip 148.93 kB)
```

---

## P0-2 — the emergency numbers

### What the screens offer now

Every link on the two screens that carry help lines, read out of the rendered
DOM (`/shield` and `/help`, both languages, 390×844):

| href | visible text (ar) | visible text (en) |
| --- | --- | --- |
| `tel:911` | «911 عند الخطر المباشر» | "911 In immediate danger" |
| `https://www.psd.gov.jo/` | «الصفحة الرسمية» | "Official page" |
| `mailto:fpj.dept@psd.gov.jo` | `fpj.dept@psd.gov.jo` | same |
| `tel:196` | «196 اتصل» | "196 Call" |
| `mailto:ecrimes@psd.gov.jo` | `ecrimes@psd.gov.jo` | same |
| `tel:911` | «911 اتصل» | "911 Call" |
| `https://www.psd.gov.jo/` ×3 | «psd.gov.jo» under each row | same |

Plus the Shield screen's red danger card: `tel:911`, «اتصل بـ 911 الآن».

**Zero dead buttons. Zero «بانتظار التحقق».** The four keys that carried that
wording are deleted from both dictionaries, so a screen cannot say it and still
typecheck.

### The one row with no number

Family Protection & Juveniles Dept. publishes one number per governorate. It
gets no number at all — instead the row says so, routes immediate danger to
911, opens the directorate's page, and gives `fpj.dept@psd.gov.jo`.
`why_no_number_note` in the content file tells the next editor not to "fix" it
by picking a governorate.

### The name

| where | before | after |
| --- | --- | --- |
| Report screen (`authority.cybercrime_unit`) | وحدة الجرائم الإلكترونية — **وزارة الداخلية** | وحدة مكافحة الجرائم الإلكترونية — إدارة البحث الجنائي / مديرية الأمن العام |
| Shield / Recover list | (no affiliation shown) | same string, from `affiliation` in the record |

Both screens render one shared component now, so they cannot drift apart again.

The Shield screen's own danger card had a third version: the Arabic said
«اتصل بالأمن العام» and the English said "call **Jordan Police**", which is not
the body's name. Fixed, and a test now fails on that string anywhere in either
dictionary.

### What is NOT independently verified

The values come from Zaid's 16 Sep check, recorded with `verified_by` on each
row. **This machine cannot open psd.gov.jo** — the egress proxy refuses it — so
the deep source paths that were first written into the file were constructed
rather than read, and have been replaced by `https://www.psd.gov.jo/` with a
`source_note` on each row explaining the gap.
`.github/workflows/verify-sources.yml` opens every URL in the file from a
GitHub runner. **Run `35186792572`: psd.gov.jo did not answer it either** — the
connection timed out after the full 25 seconds, as did `jocert.ncsc.jo`. That is
what a Jordanian government host does to foreign traffic, and it is evidence
neither way. The job now fails only on a real error answer from a host that did
reply, and reports an unreachable host as inconclusive.

So: **nothing available to this build can open psd.gov.jo.** The one check that
settles it is a phone in Jordan tapping «الصفحة الرسمية» on Recover. That is
line 5 of the checklist for exactly this reason.

### Two things found while screenshotting, not in the brief

- **The call buttons were invisible in dark mode.** `bg-ink text-white-brush`
  is 16.8:1 in light and **1.05:1 in dark**, because dark mode swaps `--ink` to
  `#f2eeec` while `--white` stays `#f7f4f3`. «911 اتصل» was near-white on
  near-white. `text-paper` inverts with the theme: 17.4:1 light, 16.2:1 dark.
  The same pairing was in three other places (Shield's quick exit, Protect's
  search, Lab's language toggle) and all four are changed.
- **`vite preview` serves a stale asset listing after a rebuild**, which
  renders a blank page and looks like an app crash. Every screenshot run here
  starts a fresh port for that reason.

### Guards

`test/contacts.test.ts`, 15 tests. Four of them were proven to fail against the
old state before being kept: restoring «وزارة الداخلية», restoring
`shield.pending_number`, and dropping the string `20224` into a source file each
turn the suite red.

```
tsc --noEmit: clean
23 test files, 229 tests passed
honesty-check: clean
vite build: dist/client/assets/index-*.js 496.68 kB (gzip 150.18 kB)
```

---

# P1 — evidence

## P1-1 — the field reads as a field

Measured in the browser at 375px, both themes, not read off the stylesheet:

| | before (Zaid, production) | after |
| --- | --- | --- |
| field surface vs card, light | 1.06:1 | **1.15:1** (`#f2eeec` on `#ffffff`) |
| border vs card, light | 1.26:1 | **3.65:1** (`#8a8582`) |
| border vs field, light | — | **3.16:1** |
| border vs card, dark | 1.19:1 | **3.85:1** (`#7b7573`) |
| border vs field, dark | — | **3.30:1** |
| focus | `outline: none`, nothing | border → `#c40c29` light / `#e03a52` dark + 3px ring |
| border width | 0.8px | **2px** |

The brief asked for 1.5px. Chrome snaps a sub-pixel border down — `getComputedStyle`
returned `1px` — so it renders at 2px instead. Dark needed its own focus red:
the brand `#c40c29` is 2.85:1 on the dark card, below the 3:1 bar, so a ring in
it is a ring nobody sees. The app-wide `:focus-visible` uses the same token now.

Also: «مسح» appears once there is something to clear, and «إرفاق لقطة شاشة» is a
full-width dashed row saying «نقرأ النص من الصورة» rather than a 36px pill beside
«لصق». No horizontal scroll at 375px in either theme.

## P1-2 — the field follows the chip

It was a disconnected wire. `TYPE_META` and the five `scan.ph_*` strings both
existed; the textarea rendered `scan.input_ph` regardless. Read back out of the
rendered DOM after tapping each chip:

| chip | label | placeholder |
| --- | --- | --- |
| نص | نص الرسالة | الصق نص الرسالة المشبوهة… |
| رابط أو موقع | الرابط أو الموقع | الصق الرابط… |
| رقم هاتف | رقم الهاتف | مثال: 07 9XXX XXXX |
| عرض عمل | عرض العمل | الصق عرض العمل… |

Five chips became four. The engine never branched on `website` — it only ever
wrote `TYPE: <value>` into the prompt — so merging it into «رابط أو موقع» is a
chip change, not an engine change.

The honesty check stopped the build on the new placeholder, correctly: it flags
every number in UI copy. Approved by key with the reason (a mask is not a
number), in `scripts/honesty-check.mjs`.

## P1-3 — a report from a verdict

Read out of the rendered DOM at 375px:

```
radios: 0     text inputs: 0     chips clipped off-screen: []     h-scroll: false
chips: تصيّد · احتيال مالي · عرض عمل وهمي · ابتزاز إلكتروني · استيلاء على حساب · أخرى
       رسالة نصية · واتساب · مكالمة · بريد إلكتروني · تواصل اجتماعي · أخرى
```

«ابتزاز إلكتروني» was the chip sitting off the edge of a scrolling rail. Both
groups wrap now. The prefill carries category, message text, the entity the
verdict extracted, and the channel when the chip already said so («رقم هاتف»
is a call; nothing in a verdict distinguishes SMS from WhatsApp, so it does not
guess at those).

**«الجهة المعنية» is gone as an input and the report sends no authority field at
all.** Nothing ever read `relevant_authority` back out of the database, and a
radio list asked someone in trouble to classify Jordanian jurisdiction before
they could send anything. What replaces it is the same verified record the
Recover screen shows — one sourced, dated jurisdiction claim instead of four
unsourced ones — under «مين بيتعامل مع هذا النوع من البلاغات» and «للمعلومات
فقط. بلاغك لا يُرسل إلى أي جهة.»

Item 6 was already built: `CaseNumber` is 28px extrabold with a copy button and
a select-the-text fallback, and `rememberCase` saves to «بلاغاتي».

## P1-4 — the flagged spans

Rendered against the staged demo SMS, measured in both themes:

| | before | after (light) | after (dark) |
| --- | --- | --- | --- |
| fill vs card | `--red-soft`, 1.17:1 | **1.74:1** `#edb6bf` | **1.49:1** `#701221` |
| when tapped | — | `#e48f9d` | `#8e1226` |
| underline | 2px `--red` | **none** | none |
| number | 0.7em `<sup>` | 18px filled badge | 18px filled badge |
| ink on the fill | — | 10.57:1 | 10.13:1 |

Every fill is the brand red mixed into the surface it sits on — 30% over white,
50% over the dark card — so the palette still has exactly one accent.

Tapping a span sets `aria-pressed` and lights exactly one row in «لماذا»;
tapping the row does the same in reverse. Verified by clicking the first mark:
`pressed: "true"`, `reasonLit: 1`.

### A bug this found

The «لماذا» list was printing **`prelim.payment`** and **`prelim.deadline`** at
the reader. `preliminaryResponse` stores an i18n key in a flag's `why` while the
engine stores a sentence, and the screen rendered `{item.why}` raw — so every
fallback verdict, which is exactly the situation the fallback exists for, showed
key names on a 375px phone. `t()` falls through to the raw string for an unknown
key, so one call is correct for both paths. My P0-1 test had checked that the
dictionary held the keys, not that the screen resolved them; the new test checks
the screen.

```
tsc --noEmit: clean · honesty-check: clean
26 test files, 260 tests passed
vite build: dist/client/assets/index-teB2E1Cu.js 497.67 kB (gzip 150.62 kB)
```

---

# P2 — evidence

## P2-1 — the shield has a door on Home

It was reachable through تعافي's last card or the second card on Recover —
seventh of seven for the one person who cannot afford to browse. Now: directly
under the scan card on Home, red-outlined rather than filled, because «افحص
الآن» immediately above it is the filled one and two solid red blocks in a row
mean neither is the primary action. On Recover it moves from seventh to first.

## P2-2 — the Recover icons

A wrench is what you fix a tap with. تعافي is for someone who has just lost
money or had an account taken, so it takes the lifebuoy the nav already uses
for the same door — Home, Recover and the nav now agree.

The six plans were drawn identically. Money-loss carries «الأسرع أفضل» and the
red icon tone: money that has just left an account can sometimes be stopped,
and only for a while. That is a different card from "change your passwords".

## P2-3 — the radar

Read back from the rendered DOM at 375px, both languages:

```
cells saying "no data": 0      bars in brand red: 11      "not a national statistic": present
horizontal scroll: false       clipped axis labels: []
```

| | before | after |
| --- | --- | --- |
| the numbers | `6` · `6` · `15` in three cards | `9` reports **«كلها هذا الأسبوع»** · `15` documented |
| bars | black, value only at the row's end | brand red, 8px, value on each |
| 8-week chart | 2 bars, no values, no axis | value above each bar, «بلاغات في الأسبوع», 3 week labels |
| empty blocks | 4 cards each saying "no data" | none render; one sentence + a link into the campaigns |

The duplication was real and the fix is not cosmetic: on a platform young enough
that every report arrived this week, "reports this week" and "reports in total"
are the same fact. The week is a line under the platform count now.

The axis labels were clipped («27 ت…») because eight flex cells at 375px are
~40px wide. Three labels laid out start / centre / end share the full width;
`scrollWidth > clientWidth` is 0 for every label in both languages.

## P2-4 — the nav and the header

Measured on three routes:

```
bar: 12px from each side, 10px from the bottom, radius 26px,
     backdrop-filter blur(14px) saturate(1.4)
header: position sticky, top 0 before and after scrolling 400px,
        background rgb(251,248,248) — the page colour, never red
        hairline rgba(0,0,0,0) unscrolled → rgb(234,228,226) scrolled
```

The 54px notch reserve is gone: `env(safe-area-inset-top)` already accounts for
it, and it pushed the first real thing on every screen past the fold.

The scan button was a scan frame on a button that opens a form you paste into.
It is a magnifier until the camera exists (P3-2).

Swept all ten routes in both themes: no horizontal scroll, and **no control
overlapped by the floating bar at the bottom of any page** — `--nav-total` grew
by `--nav-gap` so a page still keeps that much clear.

## P2-5 — one language at a time

Walked seven routes in ar and then in en:

```
ar: the only Latin left is ecrimes@psd.gov.jo and fpj.dept@psd.gov.jo
en: the only Arabic left is «عر» (the toggle, which names the other language
    by design) and «درع» in the brand tile
```

Eleven of fifteen campaigns had no English summary, entity or source name, so
`pick()` fell back to Arabic — working as designed, and the design was the
problem. All fifteen carry both now, and `test/language.test.ts` fails on a gap
rather than falling back silently.

The four seeded community reports were English inside the Arabic UI.
`description` is one column and a real report holds whatever the person wrote,
so it cannot carry two languages and must never be rewritten. A seed is ours:
migration `0005_seed_language.sql` gives it a `seed_key` and the words live in
`content/community-seed.json` in both languages. A real report still renders
its own words verbatim.

The three quoted specimens stay Arabic. That is the message as it arrived and
it is what gets pasted into the scanner; in English the translation sits under
it, labelled.

### The migration has not run on production

`wrangler d1 migrations apply dara --remote` needs Cloudflare credentials this
build does not have, and nothing in CI applies them — `deploy:ci` would, but
the deployment happens through Cloudflare's own build. So the Worker will reach
production before `seed_key` exists on the remote database.

Asking for a column that is not there throws, and the handler's catch would
have answered with an empty feed: **the whole «بلاغات المجتمع» section would
have vanished** rather than simply showing its English seeds. The query asks
for the column, and asks again without it if that fails. Proven locally by
dropping the column:

```
with seed_key:     4 reports, keys present  → Arabic renders
column dropped:    4 reports, keys null     → English descriptions render
```

**Abdelrahman: run `npm run db:migrate` once** (it is
`wrangler d1 migrations apply dara --remote`) and the Arabic seeds appear.
Nothing breaks until you do.

```
tsc --noEmit: clean · honesty-check: clean
28 test files, 278 tests passed
```
