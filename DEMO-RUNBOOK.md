# DEMO-RUNBOOK.md

For the Crown Prince Award jury, Wednesday 16 September 2026.
Everything below was clicked through on a build of this commit. Where the app
does not do something, this says so.

---

## Before you leave the house

**1. The key. Nothing else on this page matters until this is done.**
Open `https://dara.abdalrhmankurdi12.workers.dev/api/health`. It must say
`"key_present": true`. **Today it says `false`**, and while it does, every scan
ends in *تعذّر إكمال الفحص* — the rest of the app works, Scan does not.

Cloudflare dashboard → Workers & Pages → `dara` → Settings → Variables and
Secrets → add `ANTHROPIC_API_KEY` as a **Secret** → then push anything, or hit
**Retry build**, because a secret only reaches the Worker on its next deploy.
Never paste that key into a chat or a file.

**2. Warm the phone.** On good wifi, run the three messages below once each. A
staged message checked live once leaves its real verdict on that device, so if
the venue's network is bad the same message still answers — labelled **نتيجة
محفوظة**, never silently.

**3. Add it to the home screen.** It opens without a browser bar, and the icon
is the mark rather than a screenshot of the page.

**4. Your language is already set.** The app opens in **Arabic**, right-to-left,
from the first paint — you do not tap anything. If a judge asks to see it in
English, tap **EN** in the top corner and the whole app flips, tab bar included;
tap **عر** to come back. That choice lasts only as long as the tab is open, so a
relaunch on stage always returns to Arabic.

**5. Know the bar.** الرئيسية · فحص · بلاغاتي · الرادار · تعافي — and reading
right-to-left, **فحص** is the raised red circle, second from the right. That
circle is the one control to reach for if anything goes sideways.

---

## 1. The first scan — the fake Amman Municipality fine

Long-press the **mark** on Home for about a second and a half. The rehearsal
tray opens; tap the message from there, so there is no typing and no
autocorrect on stage.

> أمانة عمان الكبرى: بذمتك مخالفة مرورية غير مدفوعة بقيمة 45 ديناراً. ادفع خلال 24 ساعة لتجنب مضاعفة الغرامة: http://amanat-amman-pay.com/fine

*Greater Amman Municipality: you have an unpaid traffic fine of 45 JOD. Pay
within 24 hours to avoid the amount doubling: http://amanat-amman-pay.com/fine*

**Say that this is a reconstruction of that family of messages, not a real SMS
anyone received.** The real text is still waiting on you —
`gam_parking_fine` in `content/eval-cases.json` is a placeholder.

Expect **احتيال / Scam**, a solid red band.

---

## 2. The thing to point at — the Jordan layer

Scroll past the verdict. The screen reads in one order, every time:

1. **The message as you received it.** The deadline, the threat and the link
   are underlined in red where they sit, numbered.
2. **لماذا** — the same numbers again, one reason each. Follow one with your
   finger from the underline to its reason. This is the moment.
3. **الطبقة الأردنية — the Jordan layer.** This is the slide. Read two rows out:

   > الرسالة تدّعي أمانة عمان الكبرى ونطاقها الرسمي ammancity.gov.jo

   > قوائم التهديد: تعذّر التحقق

   The first is a fact checked against this app's directory of official bodies
   — 55 of them. The second is a check that did not answer, **shown as a row,
   in grey, rather than left out** — because a missing row would read as a
   clean bill of health. Then the line under the block:

   > هذه حقائق مُتحقَّق منها لحظياً، وليست حكماً.

4. **الرابط** — the link pulled apart: what it is, which host actually decides
   where it goes, and why each part is a problem. The link is text. Nothing on
   this screen is tappable, which is the whole point.
5. **نمط مشابه رُصد سابقاً** — the documented campaign it resembles, with the
   name of the source that published the warning underneath.
6. **ما الذي يحدث هنا؟** — the impersonated body, the threat type, what it asks
   for, the likely goal, the pressure used.

If a judge asks *how does it know?* — that is rows 3 to 5, and none of them is
the model. The model reads the message. The layer checks it.

---

## 3. The report, and the sentence to read aloud

From the result, tap **أبلغ عن هذه الرسالة**. **بلاغاتي** opens with the
threat type already chosen.

The report is **always anonymous** — there is no toggle to leave on and no
contact field, because the app does not ask for one. Pick the channel, leave
**الجهة المعنية (لمعلوماتك أنت)** where it is, and type two sentences into
*ماذا حدث؟*. The button stays grey until there are twenty characters.

Submit. The case number comes up large. Then read this out, slowly:

> بلاغك محفوظ في منصة درع (نسخة تجريبية). لم يُرسَل إلى أي جهة. افتح تبويب
> «تعافي» لتعرف كيف تصل إلى الجهة المعنية بنفسك.

*Your report is stored on the DARA' platform (pilot). It has not been forwarded
to any authority. Use the Recover tab for how to reach the relevant authority
yourself.*

That is the answer to the hardest question in the room, and the app says it
before anyone asks. Do not soften it.

Scroll down **بلاغاتي** afterwards: **بلاغات المجتمع** shows four reports,
each tagged **مثال أضافه الفريق**. Say they are seeded examples. (They are in
English even in the Arabic build — they are literal rows in a migration.)

---

## 4. Radar

**الرادار** tab. Three numbers across the top, then, immediately under them:

> ثلاثة أرقام منفصلة لا تُجمع: بلاغات وصلت إلى منصة درع، وحملات وثّقها الفريق.
> ليست إحصاءً وطنياً.

Read that line. It is the difference between a demo and a claim. Every number
on the screen counts rows in this app's own database — the bar chart covers the
last eight weeks, with the dates under it, and most of those weeks are empty
because this is a pilot with a handful of reports in it.

Then the second segment, **الحملات الموثقة**: fifteen real campaigns, each with
a date and a named source. Open one and point at the source line. That is where
the Jordan layer's campaign row came from.

---

## 5. Where the trust page would go — and what to show instead

**The transparency page is not built.** The brief calls for it as the closing
beat; it is not in this build, and you should not describe one. Its copy is
ported and sitting in the dictionaries, and part of that copy states accuracy
figures for a classifier this app does not run — which is why it is not on
screen rather than half-true.

What is on screen, and makes the same point:

- Every help line under **حماية** says **قيد التحقق** and none of them dials.
  Nobody has checked those numbers against an official source, so the app will
  not print one. Say this out loud — a jury that has seen apps invent a hotline
  will notice.
- The Jordan layer's **تعذّر التحقق** rows, from §2.
- Radar's *ليست إحصاءً وطنياً*.
- The report sentence from §3.

Four places where the app says what it does not know. That is the argument.

---

## If the venue network is bad

Nothing to do. A staged message you warmed up falls back to its saved verdict
and shows **نتيجة محفوظة** next to *تحليل بالذكاء الاصطناعي عبر خادم درع*. Read
the label out rather than hiding it.

A message you did **not** warm up has no fallback and will show an error. Do
not improvise a fourth message on stage.

---

## If you have another minute

- **حماية → درع الابتزاز.** Triage first: five situations, no AI anywhere in
  this flow. **خروج سريع** at the top replaces the page so Back cannot return
  to it — press it once and show that it works.
- **حماية → تعافي → حُوِّل مبلغ من حسابي.** Seven steps in order of urgency;
  the first is *أوقف أي دفعة أخرى الآن*, because minutes count.
- **الرئيسية → تحقق قبل الدفع.** Opens the directory with the cursor already in
  the lookup. Type a domain and it says what DARA' can confirm about it — and
  says plainly when it cannot.
- **الرئيسية → تدرّب دقيقتين.** Six messages, three of them legitimate on
  purpose.
- **افحص لقطة شاشة**, in the box on Home or on the Scan screen. Have a
  screenshot of a message in the gallery before you go.
- The **moon** button on any screen. The whole app has a dark theme.

---

## The hard rule for the presenter

**Never claim anything the app does not literally do.**

- Reports are stored on **منصة درع**, a pilot. They are not forwarded to the
  Cybercrime Unit, the TRA, a bank, or any ministry. The authority list is
  labelled *لمعلوماتك أنت* and that is all it is.
- It is **HTTPS**, and it asks for no account, no name and no phone number. It
  is not "fully encrypted" and it does not "store nothing". The text of a
  message is stored only if you choose to attach it to a report.
- **تحليل بالذكاء الاصطناعي عبر خادم درع** is what the footer says, and it is
  the whole claim: a real AI model produced this verdict, the call was made
  from DARA's server rather than the phone, and the seconds next to it are the
  real round trip. **The app does not name the model, and neither should you.**
  It runs through OpenRouter and the model is a config line that may change
  between rehearsal and the room; naming a vendor on stage is a claim you would
  then have to keep true. If a judge asks which model: say it is a frontier
  model reached through a gateway, that the choice is made by the golden set in
  `content/eval-cases.json` rather than by taste, and offer to show them the
  eval report. A result labelled **نتيجة محفوظة** is a real earlier verdict
  replayed from the device. Say so when it appears.
- The fifteen campaigns and the 55 official bodies are real and sourced, and
  **this team has not re-checked those sources** — both lists came across from
  the earlier build already marked verified. If a judge asks who checked them,
  that is the honest answer.
- Anything the app does not show you — an emergency number, an article of the
  cybercrime law — is withheld on purpose, because nobody has checked it
  against an official source. If a judge asks, that is the answer, and it is a
  good one.

If something fails on stage, say what failed. This jury has seen polished demos.
