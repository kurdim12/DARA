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

## 8. Arabic register: what is still colloquial

The reference build's Arabic is colloquial Jordanian; this build's is simple
فصحى. The merge brief allows fixing labels that mix registers on one screen,
and says not to rewrite content — so Home's labels were changed and nothing
else was. These are the ported strings that still read as عامية: a decision
for Abdelrahman, not a bug. The trust page (`ft.tp.*`) and the drill
(`ft.tr.*`) are the two largest blocks, and both are *content*, not labels.
The QR strings stay hidden until that tool works, per the brief.

| Key | Marker | Arabic |
| --- | --- | --- |
| `ft.hist.empty` | negation | ما في فحوصات محفوظة بعد |
| `ft.hist.empty_sub` | particle | أول فحص بعد ما تشغّل الخيار بيسجّل هون. |
| `ft.hist.note` | clause | محفوظة على جهازك فقط، وبتروح لما تمسح بيانات المتصفح. |
| `ft.home.tool_qr_sub` | clause | اقرأ الرمز قبل ما تفتحه |
| `ft.qr.denied` | particle | ما وصلنا إذن الكاميرا. فعّله من إعدادات المتصفح، أو الصق الرابط هون. |
| `ft.qr.found` | ب-imperfect | الرمز بيحتوي: |
| `ft.qr.warn` | ب-imperfect | لا تفتحه قبل الفحص. درع ما بيفتح الرابط، بيقرأه فقط. |
| `ft.soon.auto_sms.what` | clause | درع يقرأ الرسائل الواردة على الجهاز نفسه وينبّهك على المريبة قبل ما تفتحها، بإذن صريح منك وبإمكانية إيقافه بأي لحظة. |
| `ft.soon.campaign_alerts.what` | clause | إشعار لما تنزل حملة احتيال موثقة جديدة بالأردن، مع نص التحذير ومصدره. |
| `ft.soon.note` | particle | هاي الميزة لسا ما اشتغلت. منكتبها هون لما تصير جاهزة فعلاً، بلا وعود بتواريخ. |
| `ft.soon.partner_board.what` | particle | لوحة لجهة رسمية أو بنك: البلاغات المتعلقة باسمها مجمّعة بأرقام فقط، والنطاقات اللي تنتحلها الحملات. |
| `ft.soon.video_check.what` | particle | فحص مقطع فيديو لشخصية عامة تظهر فيه: هل في علامات تزييف عميق، ومن وين انتشر المقطع أول مرة. |
| `ft.tp.foot` | particle | إذا لقيت شي مكتوب هون مش مطابق للواقع، هاي مشكلة لازم تنحل، مش تفصيل. |
| `ft.tp.intro` | ب-imperfect | درع ما بيحزر. كل نتيجة بتطلع من طبقات معروفة، وكل معلومة إلها مصدر مكتوب. وهاي الصفحة بتقول شو بنقيس فعلاً وشو لسا ما انقاس. |
| `ft.tp.l_clf_what` | ب-imperfect | نموذج صغير بيقارن شكل الرسالة مع رسائل احتيال معروفة، وبيعطي إشارة مساعدة، مش قرار. إشارته بتظهر كدليل جنب باقي الأدلة. |
| `ft.tp.l_honesty_what` | ب-imperfect | بتتحقق من جواب النموذج قبل ما يوصلك: كل علامة حمراء لازم تكون موجودة حرفياً بالنص، وأي رقم أو جهة ما إلها سند بتنشال. إذا الجواب ما مشي بالشكل المطلوب، بترجع رسالة خطأ مش نتيجة. |
| `ft.tp.l_jordan_what` | ب-imperfect | بتقارن اللي وصلك مع دليل الجهات الرسمية، والحملات الموثقة بالأردن، وبلاغات درع نفسها، وسجلات النطاقات. كل استعلام ما جاوب بيظهر «تعذّر التحقق» بدل ما ينحسب سليم. |
| `ft.tp.l_llm_what` | ب-imperfect | بيقرأ الرسالة كما يقرأها إنسان: مين المرسل، شو بيطلب، وين الاستعجال والتهديد. بيشتغل على خادم درع، ونص الرسالة بينمرّ عليه وقت الفحص فقط. |
| `ft.tp.l_url_what` | ب-imperfect | بيفكّك الرابط لأجزائه ويقارن الجزء اللي بيقرّر وين بتروح، ويشوف إذا النطاق حديث أو بيقلّد اسم جهة معروفة. درع ما بيفتح الرابط أبداً. |
| `ft.tp.m_caveat` | negation | الشريحة العربية هي تغريدات عربية من مجموعة عامة للرسائل المزعجة والعادية، لأنه ما في مجموعة عامة لرسائل احتيال أردنية. وفي {n} صف أردني اصطناعي استُخدمت بالتدريب فقط وما انقاس عليها شي. الأرقام فوق كلها من شريحة الاختبار المحجوزة. النصف السليم من تلك المجموعة أغلبه منشورات وكالات أخبار، وهذا جزء من سبب ارتفاع الرقم العربي. |
| `ft.tp.m_none_line` | ب-imperfect | المصنّف الخفيف ما انقاس على مجموعة اختبار لهلأ، وما في رقم دقة نقدر نكتبه. لما ينقاس، بتطلع الأرقام هون كما هي، مع حجم المجموعة وتاريخ القياس. |
| `ft.tp.p_noname` | negation | ما منطلب اسمك ولا رقم هاتفك. |
| `ft.tp.p_pilot` | ب-imperfect | درع نسخة تجريبية، والبلاغات بتوصل منصة درع فقط. |
| `ft.tp.p_text` | ب-imperfect | نص الرسالة ما بينحفظ إلا إذا اخترت تبعث بلاغ. |
| `ft.tp.s_rdap` | ب-imperfect | RDAP: السجل الرسمي للنطاقات، منه بنعرف عمر النطاق ومُسجِّله. |
| `ft.tp.sub` | ب-imperfect | شو بيقرأ، ومن وين |
| `ft.tr.answer_scam` | particle | هاي رسالة احتيال موثقة. |
| `ft.tr.empty` | ب-imperfect | ما في رسائل جاهزة للتمرين هلأ. بتظهر هون لما يتم ربط كل رسالة بحملة موثقة بمصدرها. |
| `ft.tr.sub` | particle | ثلاث رسائل موثقة، شو رأيك بكل وحدة؟ |
| `ft.tr.wrong` | particle | مش بالضبط |
| `sh2.lookup_hint` | من-imperfect | نعرض بلاغات منصة درع عن هذه القيمة فقط. ما عندنا سجل للحسابات البنكية ولا للمعرّفات، وما منقدر نقول إن الحساب سليم. |
| `sh2.lookup_label` | clause | تحقّق قبل ما تدفع |
| `sh2.text_actions` | particle | شو تعمل هلّأ: |
| `ui2.jl.official_match.body` | negation | قارنّا النطاق الذي في الرسالة بدليل الجهات الرسمية الذي راجعه الفريق، فوجدناه مطابقاً. معنى ذلك أن الرابط يعود للجهة نفسها، لا لنطاق يشبه اسمها. تبقى بقية الرسالة تستحق القراءة بهدوء: نطاق صحيح لا يجعل كل ما في الرسالة صحيحاً. |

34 strings of 661.


## 9. After Phase 2: where every feature lives now

Section 3 is the Phase 0 snapshot and is left as it was. This is what the merges
table changed, and what it did not.

| Reference feature | Entry point now |
| --- | --- |
| Documented campaigns, with source and date | Radar tab → **Documented campaigns**, and the three newest on Home |
| The Jordan radar's numbers | Radar tab → **Radar**, with its "not a national statistic" line |
| Pattern families | Radar tab → **Common patterns** |
| Official entities directory | Home → **Official institutions** (the Protect screen), lookup on top |
| Two-minute drill | Home → **Two-minute drill** (the Learn screen) |
| Extortion shield, triage first, quick exit on every view | Help tab → **Extortion shield** |
| Recover, one list ordered by urgency | Help tab → **Recover**, and Home → **Recover** |
| Always-anonymous report, channel + entity + attached text | Report tab |
| Receipt with the case number | Shown when a report is sent, and on Home as **Latest report** |
| Clipboard consent | The sentence under **Paste from clipboard**, in the scan box |
| Screenshot analysis | **Scan a screenshot**, in the scan box on Home and Scan |
| Jordan layer on a result | Inside a scan result |
| PWA, installable, offline shell | Add to Home Screen |

Still with no home in this app, all from the reference side:

| Missing | What it would take |
| --- | --- |
| **Trust page** (`ft.tp.*`, 40+ strings already ported) | A screen and a nav entry. Its copy states accuracy figures for the reference's own classifier — which this app does not run — so those rows cannot be shown here as written, and the honesty gate should be pointed at the file before it renders. |
| **On-device lite classifier** (`cls.*`) | A 346 KB model chunk plus inference, and a measured accuracy number of our own. Not a today job. |
| **"My checks" history, off by default** (`ft.hist.*`) | A local store, a toggle, and a screen. Small. |
| **Share target** (`GET /scan?title&text&url` in the manifest) | A manifest entry and Scan reading three query parameters. Smallest of the four, and it is the one that puts DARA' in the phone's own share sheet. |
| **"My reports"**, the full list | Home shows the latest; `src/lib/storage.ts` already keeps up to 20. A list screen is small. |
| **QR** | Stays hidden until it works, per the brief. Its strings are ported and its code is not deleted. |

Two other facts worth knowing before the demo:

- **`/threats` still exists and nothing links to it.** Radar's *Common patterns*
  segment renders the same list, so the screen is a duplicate that is now only
  reachable by typing the URL. Its code is left in place.
- **The English directory falls back to Arabic for 49 of its 55 entries.** The
  reference build wrote `never_en` for six bodies and `never_ar` for all of
  them, so English mode shows the Arabic line rather than nothing. Translating
  the other 49 is content work, which this phase was told not to do.
- **The four seeded community reports are in English only.** They live in
  `migrations/0002_report_fields.sql` as literal rows, and the Report tab reads
  them straight out of D1, so in Arabic they appear in English under an Arabic
  heading. They are labelled as team-added examples, which is honest, but a
  jury reading the Arabic build sees English. Fixing it means either replacing
  the seed text with Arabic or adding a second column — a schema decision, not
  a copy edit.

