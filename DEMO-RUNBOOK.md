# DEMO-RUNBOOK.md

For Wednesday 16 September 2026, in front of the Crown Prince Award jury.
Everything here was checked against the built app, not written from memory.

---

## Before you leave the house

**1. The key.** Open
`https://dara.abdalrhmankurdi12.workers.dev/api/health`. It must say
`"key_present": true`. Today it says **false**, and while it does, every check
returns an error — the rest of the app works, Scan does not. Cloudflare
dashboard → Workers & Pages → `dara` → Settings → Variables and Secrets → add
`ANTHROPIC_API_KEY` as a **Secret** → redeploy. Never paste that key into a
chat or a file.

**2. Warm the phone.** On good wifi, run all three demo messages once. A staged
message checked live once leaves its real verdict on that device, so if the
venue's network is bad the same message still answers — labelled
**Saved result**, never silently.

**3. Add it to the home screen.** It opens without a browser bar and shows the
mark rather than a screenshot of the page.

**4. Decide your language.** The app opens in **English**. The staged messages
are Arabic, so if you are demoing in Arabic, tap **عر** first — the whole app
flips, including the nav order.

---

## The three messages, in order

Long-press the **DARA'** logo on Home for about a second. The staged tray
opens; tap the message from there — no typing, no autocorrect. The English
wording below is there if you would rather paste.

**1 — The obvious one. Expect: High risk.**

> أمانة عمان الكبرى: بذمتك مخالفة مرورية غير مدفوعة بقيمة 45 ديناراً. ادفع خلال 24 ساعة لتجنب مضاعفة الغرامة: http://amanat-amman-pay.com/fine

> Greater Amman Municipality: you have an unpaid traffic fine of 45 JOD. Pay within 24 hours to avoid the amount doubling: http://amanat-amman-pay.com/fine

Point at the quoted message on the result: the link, the deadline and the
sender name are underlined in red and numbered to match the reasons beneath.
**Say that this is a reconstruction of that family, not the real SMS** — the
real text is still waiting on you (`gam_parking_fine` in the golden set).

**2 — The subtle one. Expect: High risk.**

> معك قسم الاحتيال في البنك. رصدنا حركة مشبوهة على حسابك. رح يوصلك رمز على هاتفك، اقرأه لي حتى نوقف العملية فوراً.

No link at all. The attack is entirely social, and the app still has to name it.
Tap the **Call** chip first, so the scanner is told what it is looking at.

**3 — The control. Expect: Safe.**

> رمز التحقق الخاص بك هو 482913. لا تشارك هذا الرمز مع أي شخص، ولن يطلبه منك موظفو البنك أبداً.

Same subject as message 2, opposite verdict. **Run this one.** It is the answer
to the question this jury always asks: *does it just say scam to everything?*

---

## If the venue network is bad

Nothing to do. A staged message you warmed up falls back to its saved verdict
after 12 seconds and shows **Saved result** next to *Powered by Claude*. Read
that label out rather than hiding it.

A message you did not warm up has no fallback and will show an error. Do not
improvise a fourth message on stage.

---

## The one report to submit live

From the result of message 1, tap **Report this threat** → the Report tab opens.
Leave **Anonymous Report** on. Pick **Phishing**, leave the authority on
Cybercrime Unit, and type two sentences into *What happened?* — the button stays
grey until there are twenty characters.

Submit. The confirmation shows the case number large with a **Copy** button, and
then the sentence that matters:

> Your report is stored on the DARA' platform (pilot). It has not been forwarded
> to any authority. Use the Shield tab for how to reach the relevant authority
> yourself.

Read that sentence out loud. It is the answer to the hardest question in the
room, and the app says it before anyone asks.

Scroll down on the Report tab afterwards: **Community Reports** shows four
anonymous reports. Say that they are seeded examples — nothing a visitor submits
joins that feed.

---

## Shield

Shield tab → scroll to **What happened to you?** → **Private photos or videos**
→ **Get Help Now**. Read step 1 aloud:

> Do not pay anything. Paying does not make it stop, and it tells them you pay.

Two things to point at on the way:

- Every help line says **Number pending verification** and none of them dials.
  That is deliberate. Nobody has checked those numbers against an official
  source yet, and the app will not invent one. Say so — it is a strength.
- **Quick exit** at the top of the steps replaces the page, so Back cannot
  return to it. Press it once.

---

## If you have another minute

- **Recover** → *I lost money to fraud* — seven steps, the first one being *Stop
  further payments now*.
- **Home → Learn** — the six-question quiz. Three of the six are legitimate
  messages, on purpose.
- The **moon** button, on any screen. The whole app has a dark theme.

---

## The hard rule for the presenter

**Never claim anything the app does not literally do.** Specifically:

- Reports are stored on **DARA'**, a pilot. They are not forwarded to the
  Cybercrime Unit, the TRA, a bank, or any ministry. The authority list on the
  Report screen is labelled *for your reference* and that is all it is.
- It is **HTTPS**, and it asks for no account and no name. It is not "fully
  encrypted" and it does not "store nothing". If someone turns anonymity off and
  types a contact, that contact is stored — which is why the toggle exists.
- **Powered by Claude** is true: the verdict is a real Claude call. A result
  labelled **Saved result** is a real earlier Claude verdict replayed from the
  device. Say that when it appears.
- A report count under a threat card is the real number of reports filed on
  DARA' for that family. When it says **Known pattern** instead, that means
  nobody has filed one yet — not that the number is hidden.
- Anything the app does not show you — an emergency number, the article of the
  cybercrime law — is withheld on purpose, because nobody has checked it against
  an official source. If a judge asks, that is the answer, and it is a good one.

If something fails on stage, say what failed. This jury has seen polished demos.
