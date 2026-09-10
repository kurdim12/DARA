# DEMO-RUNBOOK.md

One page. Keep it open on a second device during the run.

## Pre-stage checklist

- [ ] Phone charged above 80%, plugged in until the moment you stand up.
- [ ] Do-not-disturb on. Notifications off. No banner can appear mid-demo.
- [ ] Brightness at maximum. Auto-brightness off. Auto-lock set to Never.
- [ ] App installed to the home screen, opened once, and confirmed working.
- [ ] Hotspot on from a **second** team phone; the demo phone joined to it, venue Wi-Fi forgotten.
- [ ] Demo tray tested: long-press the mark for 1.2 s, all staged messages listed.
- [ ] Rehearsal mode toggled **off** in the tray before the real run, so the report is not marked as a test.
- [ ] Screen recording of a full clean run saved on the phone **and** on a USB stick.
- [ ] `https://<url>/api/health` opened once: `key_present: true`.

## The click path

1. Open DARA' from the home screen. The mark is on paper.
   > Narration: _________________________________________________
2. Tap **افحص رسالة**.
3. Long-press the mark instead if you want the staged message: press 1.2 s, pick
   `gam_parking_fine`, and it lands in the box. Otherwise paste it.
   > Narration: _________________________________________________
4. Leave the channel on **رسالة نصية**.
5. Tap **افحص الرسالة**. One status line shows while it works.
   > Narration while it runs: ____________________________________
6. The verdict lands: red band, one-line reason, the message with the red flags
   underlined in place and numbered.
   > Narration — point at flag 1 and flag 2: ____________________
7. Read one line from **ماذا تفعل الآن**.
8. Tap **أبلغ بشكل مجهول**. Read the line "لا نطلب اسمك أو رقم هاتفك."
9. Tap **أرسل البلاغ**. The case number appears.
   > Narration: _________________________________________________
10. If a judge asks about extortion: back to home, tap **تتعرّض للابتزاز؟**,
    show the steps and the **خروج سريع** button.

## If something goes wrong

**The check is slow (over 8 seconds).**
It falls back to the saved verdict for that staged message and tags it
"نتيجة محفوظة" on screen.
> Your line: "This is the result we recorded earlier — same engine, saved so the
> demo doesn't depend on the room's connection."

**No connection at all.**
The app shell still opens. Staged messages still return their saved verdict with
the same tag. Anything else says the check needs a connection.
> Your line: same as above.

**The engine is down or returns an error.**
Stop tapping. Switch to the recording on the phone.
> Your line: "Let me show you the recorded run while that comes back."

**The phone locks or the app closes.**
Re-open from the home screen. It starts on Home; nothing is lost, because
nothing is stored on the device except case numbers.

## Numbers to have ready

| What | Where it comes from |
|---|---|
| Time to verdict over the hotspot | `EVAL-REPORT.md`, p50 and p90 |
| Model in use | `/api/health` |
| What a report stores | `migrations/0001_reports.sql` — no IP, no user agent, no device |

## Questions a judge may ask

- **"Where does the report go?"** To the DARA' platform. It is a pilot. The
  screens say so. No claim is made that any authority receives it.
- **"Is it encrypted?"** It is sent over HTTPS. Nothing beyond that is claimed.
- **"Do you store personal data?"** The app never asks for a name or a phone
  number, and the reports table has no IP, user agent or device column.
- **"Is the AI real?"** Yes — the Worker calls Claude for every live check. A
  saved result is labelled "نتيجة محفوظة" on screen whenever one is shown.
- **"What if the message tries to trick the AI?"** An instruction inside a
  message is treated as a red flag, never obeyed; there is an eval case for it.
