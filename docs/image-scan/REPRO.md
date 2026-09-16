# Screenshot scan — reproduction

Written before any code was changed, as the brief requires.

## Where this could and could not be run

The machine this repo is edited from reaches neither
`dara.abdalrhmankurdi12.workers.dev` nor `openrouter.ai` — the egress proxy
answers `403 CONNECT tunnel failed` for both. So the brief's step 1, "from the
deployed site", was split:

- **Client → Worker** was reproduced locally against `vite preview`, which runs
  the real Worker code and the real client bundle. Everything up to the model
  call is genuine.
- **Worker → model** was run from GitHub Actions (`.github/workflows/image-scan.yml`),
  which can reach both. That is the only honest place to see the live failure.

The Worker's own log line could not be read: `wrangler tail` needs the same
network. What the live probe returns is the response body, which is what the
user sees anyway.

## Local reproduction — the exact request

One fixture (`fixtures/1-sms-fine.jpg`, 39 KB, Arabic SMS) attached through the
real «إرفاق لقطة شاشة» control and scanned:

```
POST http://localhost:4300/api/analyze
content-type: application/json
body: 53,962 bytes
{
  "text": "",
  "lang": "ar",
  "type": "message",
  "image": { "media_type": "image/jpeg", "data": "/9j/4AAQSkZJRgABAQAAAQAB…" }
}
```

```
← 502  {"error":"server_error"}
screen: تعذّر إكمال الفحص. حاول مرة أخرى.
```

The preview thumbnail rendered and «افحص الآن» enabled, so the attach path
itself works. The 502 is the model call. Locally that is indistinguishable
from "this container has no route to the gateway", which is why the live run
below is the one that decides.

## The five checks

| # | Check | Result |
|---|---|---|
| 1 | The UI button posts the image, to the image endpoint | **PASS** |
| 2 | Media type correct, base64 carries no data-URL prefix | **PASS** |
| 3 | The image survives the Worker's size limit | **PASS** |
| 4 | The analyzer call includes the image block AND a transcribe-first instruction | **PASS** |
| 5 | A 12 s timeout applies to image calls, with the cached-fallback message | **FAIL** |

### 1 — the button posts the image · PASS

The brief's premise was that the control had been removed in an earlier pass.
It was not: the UX pass moved it into `ScanInputCard` as «إرفاق لقطة شاشة»,
and it is wired to `prepareImage` → `onImage` → the same `/api/analyze` the
text path uses, with the image in the body. There is one analyze endpoint, not
a text one and an image one. Captured request above: `hasImage: true`.

### 2 — media type and base64 · PASS

`media_type: "image/jpeg"`. The payload starts `/9j/4AAQSkZJRgABAQAAAQAB`,
which is the JPEG magic number in base64 — **no `data:` prefix**.
`src/lib/image.ts:toBase64` strips everything up to the first comma, and the
Worker re-checks the media type against `ALLOWED_IMAGE_TYPES` and 415s anything
else.

### 3 — size · PASS

39 KB file → 53,962-byte request. `MAX_IMAGE_BYTES` is 3 MB and the Worker
recomputes the decoded size from the base64 length before accepting it
(`worker/index.ts:206`), returning 413 `image_too_large` rather than passing a
payload the gateway would reject. `prepareImage` already downscales past
`MAX_IMAGE_EDGE` (2576px) and steps JPEG quality down 0.92 → 0.8 until it fits.
No client-side downscale needed to be added.

### 4 — image block and transcribe-first · PASS

`worker/engine/analyze.ts` puts the image **first** in the content array and the
instructions second. `ENGINE_PROMPT_V1` carries a Screenshots section requiring
`extracted_text` — "only text you can genuinely read… Never write text that is
not visible" — and `postValidate` keeps `extracted_text` only when the request
actually had an image.

### 5 — 12 s timeout and cached fallback · FAIL

Two separate misses:

- **Worker:** `ENGINE_IMAGE_TIMEOUT_MS = 25_000`. The brief asks for 12 s.
- **Client:** the image branch of `analyze()` in `src/lib/api.ts` constructs an
  `AbortController` and then **never aborts it**. There is no timer on that
  path at all, and the comment says so explicitly — it "goes straight through
  with no race against the slow mark", so no cached-fallback message can ever
  appear for a screenshot.

A phone on venue wifi therefore waits on an image scan with no ceiling the
client enforces and no fallback when it is slow.

## Live run — and the finding that changes the task

Run `35132041294`, all six fixtures against the deployed Worker.

**Every one returned HTTP 200 with a correct verdict.** Screenshot scanning is
not broken on the deployed site. The 502 seen locally was this container having
no route to the gateway, nothing more.

| # | Fixture | Latency | Verdict | Expected | Transcription |
|---|---|---|---|---|---|
| 1 | SMS traffic fine | 11,504 ms | `scam` 98 · `traffic_fine` · أمانة عمان الكبرى | scam | accurate |
| 2 | WhatsApp job offer | 9,500 ms | `scam` 98 · `fake_job` | scam | accurate |
| 3 | Bank notification | 11,544 ms | `scam` 97 · `impersonation_bank` · البنك العربي | scam | accurate |
| 4 | OTP bait | 13,400 ms | `scam` 99 · `otp_theft` | scam | accurate |
| 5 | Legitimate OTP | 7,908 ms | `likely_safe` 90 | likely_safe | accurate |
| 6 | Delivery notice, 4 KB low-res | 11,391 ms | `likely_safe` 90 | likely_safe | accurate |

6/6 correct, including both benign messages — the engine is not simply calling
everything a scam. Arabic transcription came back clean even on the
deliberately small, hard-compressed fixture.

### The 12 s wall in the brief would break this

min 7,908 · median 11,447 · max 13,400 ms.

- **1 of 6 exceeded 12 s** and would have been cut off mid-flight.
- **3 more landed between 11.4 and 11.6 s**, inside 600 ms of the wall.
- This is a GitHub datacentre connection. Venue wifi is worse, and the request
  carries a 40-70 KB image up.

Applying it would convert a feature that works into one that fails roughly a
sixth of the time on a good network and more on a bad one, in front of the
jury. **Not applied.** `ENGINE_IMAGE_TIMEOUT_MS` stays at 25 s, which clears the
measured worst case by 11.6 s. A test pins it above 13,400 ms so nobody lowers
it without seeing these numbers.

### What was actually wrong, and the fix

The genuine half of check 5: `src/lib/api.ts` built an `AbortController` for the
image path and never aborted it. A stalled request left the spinner running
with no ceiling and no message.

One-line shape of the fix: **give the image branch a 30 s backstop and a
message** (`error.image_slow`, ar + en). 30 s sits deliberately *above* the
Worker's 25 s wall, so the Worker fails first with a reason the screen can
show and the client timer only fires when nothing answers at all.

Token usage is now captured and returned (`usage.input_tokens` /
`usage.output_tokens`) so cost per image call is measured rather than
estimated — it was not recorded anywhere before.

## Second run, after the fix — and the cost question

Run `35132945381`, same six fixtures against the deployed Worker at `a6bc1a3`.
6/6 correct again, transcriptions accurate again.

| # | Wall | Verdict | usage in/out |
|---|---|---|---|
| 2 | 12,803 ms | `scam` 98 · `fake_job` | 133 / 464 |
| 3 | 14,055 ms | `scam` 98 · `impersonation_bank` | 133 / 483 |
| 4 | 10,505 ms | `scam` 99 · `otp_theft` | 133 / 488 |
| 5 | 8,799 ms | `likely_safe` 90 | 133 / 390 |
| 6 | 9,764 ms | `likely_safe` 90 | 133 / 395 |

### Eleven live scans across both runs

`7,908 · 8,799 · 9,500 · 9,764 · 10,505 · 11,391 · 11,504 · 11,544 · 12,803 ·
13,400 · 14,055 ms` — median 11,391, max 14,055.

- **Over a 12 s wall: 3 of 11 (27%).**
- Over the current 25 s wall: 0 of 11, with 10.9 s of headroom.

The second run's slowest was 14.1 s, higher than the first run's 13.4 s. The
case against 12 s is stronger with more samples, not weaker.

### Cost per image call — NOT established, and here is why

`usage.input_tokens` comes back as **133 for every single image**, identical
across a 31 KB fixture and a 4 KB one. A screenshot cannot be 133 input tokens;
that is roughly the text prompt on its own. The gateway is not reporting image
tokens in the Anthropic-shaped `usage` field.

The image is definitely reaching the model — each transcription is specific and
correct — so this is an accounting gap, not a delivery one. **Cost per image
call therefore cannot be honestly computed from what the API returns here.**
Output tokens do look real: 390-488 per call, consistent with the verdict size.

Two ways to get the real number, neither guessed:
1. The OpenRouter dashboard's activity page, which only the account holder can
   open, shows actual charge per generation.
2. OpenRouter's `GET /api/v1/generation?id=…` returns the real cost for a
   completion id. Capturing that id and querying it would make cost a
   measurement. That is a change worth making in Phase 2, where the whole point
   is comparing two providers on cost.

### Fixture caveat

These are **rendered**, not captured from a real phone: crisp text, no camera
noise, no odd cropping. Real screenshots are harder. #6 is small and
hard-compressed to keep the set from being uniformly easy, but the set still
flatters OCR compared with what a person will actually attach.
