# MERGE-INVENTORY.md — Phase 0

Wed 16 Sep 2026. What exists where, before anything is merged.

**Reference build**: `zaidabualshaar/dara-app`, branch `gh-pages`, commit `8ebde8a`,
cloned and read as a compiled bundle. Its i18n is five split dictionaries per
language (`*.reports.json`, `*.content.json`, `*.features.json`, `*.share.json`,
plus an inline base) — **585 keys per language**, extracted verbatim, not retyped.
**Blue build**: this repo, branch `claude/kind-cray-vyr1v6`, deployed at
`dara.abdalrhmankurdi12.workers.dev`.

---

## 1. Endpoints

The reference build calls exactly six paths, all against **this** Worker — its
bundle hardcodes `https://dara.abdalrhmankurdi12.workers.dev` as its API base.

| Path | Before Phase 0 | Now |
| --- | --- | --- |
| `POST /api/analyze` | exists | unchanged |
| `POST /api/report` | exists | unchanged |
| `GET /api/report/:case_number` | exists | unchanged |
| `GET /api/threats` | exists, returns `{counts}` — the shape it wants | unchanged |
| `GET /api/radar` | **missing** | added, `worker/routes/radar.ts` |
| `POST /api/lookup` | **missing** | added, `worker/routes/lookup.ts` |

Contracts were read off the bundle's own renderers, not guessed:

- `GET /api/radar` → `{generated_at, reports_total, verified_campaigns,
  this_week:{from,to,total,by_category[],by_entity[]}, trend[{week_start,count}],
  top_hosts[{key,count}], top_numbers[{key,count}]}`
- `POST /api/lookup {q}` → `{query, kind, hint, jordan_layer}`, `400` on an empty
  query. `kind` ∈ domain|number|alias|unknown, `hint` ∈
  official|known_scam|suspicious|unknown.
- `jordan_layer` → `official_match`, `claimed_entity_mismatch`,
  `domain_age_days`, `urlhaus_listed`, `tld`/`tld_risk`, `reports_count`,
  `last_reported_at`, `campaign_id`, `operator` — every field optional, and
  `null` renders as "could not be checked".

**What the new endpoints will and will not say.** Radar counts rows in D1 and
nothing else; with six rows seeded, `top_hosts` and `top_numbers` come back
empty because no reported row carries message text yet, and the reference UI
already has that empty state. Lookup answers from the verified entities
directory, the verified campaigns and D1. Domain age and threat-list membership
need a service this Worker does not call, so they return `null`. Which network
owns a mobile prefix, and which extensions carry abuse, sit in
`content/lookup-facts.json` as `verified: false` — those rows stay off the
screen until someone sources them.

## 2. The key, the live scan, CORS

Checked from CI, because this machine cannot reach the workers.dev host —
`.github/workflows/preflight.yml`, run it on demand. It reports every endpoint's
status, `key_present`, one real `/api/analyze` with its verdict and model, and
whether CORS is an allowlist. **CORS now allows `https://zaidabualshaar.github.io`
and the Worker's own origin, nothing else, with no credentials.**

`ANTHROPIC_API_KEY` was **not** set as of the last check, and only Abdelrahman
can set it (Cloudflare dashboard → Workers & Pages → `dara` → Settings →
Variables and Secrets, as a Secret, then redeploy). Until it is, every scan
returns 503 and there is no demo.

## 3. Screens: what exists here, what does not

| Reference route | In this repo | Note |
| --- | --- | --- |
| `home` | ✅ `Home` | Different design; reference has the clipboard-consent card, campaign strip and quick tools |
| `scan` | ✅ `Scan` | Reference adds the image chip with OCR read-back and the on-device lite classifier |
| `report` | ✅ `Report` | Reference is always-anonymous with channel + entity + attach-text; this one has type chips, an authority radio and a contact field |
| `receipt` | ❌ | This repo shows a confirmation inline in Report; reference has a route with copy + save-as-image |
| `reports` ("my reports") | ❌ | Deleted in the rebuild. `src/lib/storage.ts` still remembers case numbers, so the data is there and the screen is not |
| `campaigns` (Radar) | ❌ | Nearest is `threats` — Known Threats in Jordan, 6 pattern families, no sources |
| `directory` (official entities) | ❌ | Nearest is `protect` — check sender/website + ten-minute checklist |
| `recover` | ✅ `Recover` | 5 situations here; reference has 4 "I clicked a link" branches |
| `shield` | ✅ `Shield` | 5 situations + help lines here; reference has extortion triage + quick exit |
| `transparency` (trust page) | ❌ | Nothing equivalent |
| `training` (two-minute drill) | ❌ | Nearest is `learn` — a 6-question quiz |
| `lab` | ✅ `Lab` | Dev-only in both |

Reference features with no home here at all: the **on-device lite classifier**
(`cls.*`, a separate 346 KB chunk), **clipboard consent** (`ft.clip.*`),
**"my checks" history, off by default** (`ft.hist.*`), **share target**
(its manifest registers `GET /scan?title&text&url`), and **QR** (`ft.home.chip_qr`).

Content now ported into this repo, verbatim from the bundle:
`content/campaigns.json` (15 documented campaigns, all `verified: true`, 14 with
a named source URL) and `content/entities.json` (57 official entities, 55
verified).

## 4. Which tab set renders

Three different five-tab sets are in play:

- **Reference build, live**: `home · scan · reports · campaigns · recover`
- **This repo, live**: `home · report · scan · recover · shield`
- **The merge brief's target**: `home · scan · radar · report · help`

No tab set matches another. Phase 1 adopts the brief's.

## 5. Placeholders

- **This repo: none reachable.** No screen renders "coming soon" or "قيد البناء";
  every tab and tile lands on a real screen.
- **Reference build**: `ui.wip` / `ui.wip_sub` ("قيد البناء" / "This screen is
  being built in the next phase") are defined in its dictionaries but no render
  site uses them. `ft.home.soon` ("Coming next") labels a section that describes
  planned work rather than a placeholder screen. The QR chip (`ft.home.chip_qr`)
  exists as a label — per the brief it stays hidden until it works, and its code
  is not to be deleted.

## 6. Honesty gate

The gate walked a **hardcoded list of 16 content files**, which is exactly how a
new content file gets added without ever being read. It now walks `content/`
and reads **21 files and 962 strings**. Two other things came out of splitting
it open:

- It computed a `verified` flag per record and threw it away, so a sourced,
  signed-off record was reported anyway. That flag now answers the law and the
  number rules — and answers neither claim rule.
- Naming an official body is now separated from claiming something was sent to
  it. A name ("The Jordan Times, quoting the Cybercrime Unit") is answerable by
  a verified record; "تم إبلاغ" is answerable by nothing, in any file.

Proven by injecting a forwarding claim into a verified campaign, an unsourced
number, and an authority claim in the app's own copy, and watching all three
fail the build.

## 7. Risks going into Phase 1

1. **No API key on the deployment.** Only Abdelrahman can fix it; nothing else
   on this list matters as much, and the demo is today.
2. **Three tab sets, one app.** Merging them moves every screen's entry point at
   once; the brief's table is the order to do it in.
3. **Two type systems.** Reference uses Cairo/Almarai/Rubik, this repo Manrope
   and IBM Plex Sans Arabic. The brief keeps the reference's — that is a font
   swap across every screen, in Phase 1.
4. **The campaign and entity records arrived already `verified: true`** from the
   reference build. This repo did not verify them; Abdelrahman owns
   re-confirming each source before the jury sees it.
