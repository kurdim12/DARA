# DEMO-RUNBOOK.md

For Wednesday 16 September 2026, in front of the Crown Prince Award jury.
Everything here has been checked against the built app, not from memory.

---

## Before you leave the house

**1. The key.** `https://dara.abdalrhmankurdi12.workers.dev/api/health` must say
`"key_present": true`. Today it says **false**, and while it does, every check
returns an error. Cloudflare dashboard → Workers & Pages → `dara` → Settings →
Variables and Secrets → `ANTHROPIC_API_KEY`, type **Secret** → redeploy. Never
paste that key into a chat or a file.

**2. Warm the phone.** On good wifi, open the app and run all three demo
messages once. A staged message checked live once leaves its real verdict on
that device, so if the venue's network is bad the same message still answers —
tagged `نتيجة محفوظة`, never silently.

**3. Add it to the home screen.** It opens without a browser bar and shows the
mark, not a screenshot.

---

## The three messages, in order

Long-press the درع mark on Home for about a second to open the staged tray, and
tap them from there — no typing, no autocorrect. They are also below if you
would rather paste.

**١ — The obvious one. Expect: `احتيال`.**

> أمانة عمان الكبرى: بذمتك مخالفة مرورية غير مدفوعة بقيمة 45 ديناراً. ادفع خلال 24 ساعة لتجنب مضاعفة الغرامة: http://amanat-amman-pay.com/fine

This is the slide-2 family. Watch for the link and the deadline underlined in
red inside the message itself, numbered to match the reasons below. **Say that
this is a reconstruction of that family, not the real SMS** — the real text is
still waiting on you (`gam_parking_fine` in the golden set).

**٢ — The subtle one. Expect: `احتيال`.**

> معك قسم الاحتيال في البنك. رصدنا حركة مشبوهة على حسابك. رح يوصلك رمز على هاتفك، اقرأه لي حتى نوقف العملية فوراً.

No link at all. The attack is entirely social, and the app still has to name it.

**٣ — The control. Expect: `تبدو سليمة`.**

> رمز التحقق الخاص بك هو 482913. لا تشارك هذا الرمز مع أي شخص، ولن يطلبه منك موظفو البنك أبداً.

Same subject as ٢, opposite verdict. Run this one. It is the answer to the
question a jury always asks: *does it just say scam to everything?*

---

## If the network is bad

Nothing to do — a staged message you warmed up falls back to its saved verdict
automatically after 12 seconds and shows `نتيجة محفوظة` next to
`مدعوم بتقنية Claude`. Read the tag out loud rather than hiding it.

A message you have not warmed up has no fallback and will show an error. Do not
improvise a fourth message on stage.

---

## The report

From the verdict screen of message ١, tap **أبلغ بشكل مجهول**. The confirmation
shows the case number large, with a **نسخ** button. That number is derived from
a real row in D1 — `db_ready` is true on the deployment today.

Then open **بلاغاتي** from the bottom nav: the number is listed with its status.
That is the whole loop, live.

---

## Shield

Home → **٠٣ درع الابتزاز**, or the verdict screen's red entry when the message
is extortion. Read step **٠١** aloud:

> لا تدفع أي أموال — الدفع لا يضمن توقف المهاجم

Show **خروج سريع** at the top and press it once. It replaces the page, so Back
cannot return to it. That detail matters to this audience.

---

## The six layers

Home lists all six: كشف، إبلاغ، درع الابتزاز، حماية، توعية، تعافي. The last
three are reviewed written content — say so. They are deliberately not AI.

---

## The hard rule for the presenter

**Never claim anything the app does not literally do.** Specifically:

- Reports go to **منصة درع**, a pilot. Not to the Cybercrime Unit, not to PSD,
  not to Family Protection, not to any ministry. The app never says they do,
  and neither do you.
- It is **HTTPS**, and it does not ask for a name or a phone number. It is not
  "fully encrypted" and it does not "store nothing".
- **مدعوم بتقنية Claude** is true — the verdict really is a Claude call. A
  result tagged `نتيجة محفوظة` is a real earlier Claude verdict replayed from
  the device, and you should say that when it appears.
- Anything the app does not show you — an emergency number, the article of the
  cybercrime law — is hidden on purpose, because nobody has checked it against
  an official source yet. If a judge asks, that is the answer, and it is a good
  one.

If something fails on stage, say what failed. This jury has seen polished demos.
