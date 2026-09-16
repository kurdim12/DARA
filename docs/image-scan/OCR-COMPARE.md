# OCR providers compared

Two providers, the same ten screenshots, one deployment. The primary is chosen
from this table, not from an assumption about which model reads Arabic better.

## How this was measured

`.github/workflows/ocr-compare.yml` posts each fixture to the deployed
`/api/analyze` twice, pinning the provider with `X-DARA-OCR` each time. It goes
through the app rather than calling the gateway directly, so the numbers
describe DARA' as it actually runs, and no key is needed by the harness.

Pinning has no fallback. A pinned run that quietly fell back would measure the
chain instead of the provider, which is the one thing this table must not do —
so the harness prints the provider that *answered* next to the one it asked
for, and any mismatch is called out in the row.

**Characters correct** is exact here rather than a judgement: the fixtures
render a known string, so the transcription is compared against that string
with whitespace normalised, using Levenshtein distance over characters. The
metric is unit-checked against identical, whitespace-only, half-wrong and
empty inputs before it is used.

**Cost** is computed from the tokens the gateway reports for the OCR call,
priced at OpenRouter's public catalogue rates read on 2026-09-16:

| Provider | Model | $/M input | $/M output |
|---|---|---:|---:|
| `openrouter-gemma4` | `google/gemma-4-31b-it` | 0.09 | 0.34 |
| `anthropic-haiku` | `anthropic/claude-haiku-4.5` | 1.00 | 5.00 |

## The fixtures

Ten, all Arabic. Three carry Latin numerals inside Arabic text — a Jordanian
phone number, a prize amount, a reference number and a date — which is the case
that breaks naive OCR and bidi handling. Two are deliberately small and
hard-compressed.

| # | Fixture | Expect | Note |
|---|---|---|---|
| 1 | `1-sms-fine` | scam | Amman Municipality fine, Latin URL |
| 2 | `2-whatsapp-job` | scam | job offer, advance fee |
| 3 | `3-bank-notification` | scam | bank impersonation, Latin URL |
| 4 | `4-sms-otp-bait` | scam | OTP theft by phone call |
| 5 | `5-legit-otp` | likely_safe | a real OTP warning — the control |
| 6 | `6-legit-delivery` | likely_safe | **low-res, hard-compressed** |
| 7 | `7-sextortion` | scam | routes to Shield |
| 8 | `8-prize-latin-digits` | scam | **low-res** + two Jordanian numbers |
| 9 | `9-gov-latin-digits` | scam | ministry impersonation, date + ref number |
| 10 | `10-legit-appointment` | likely_safe | clinic reminder, a time in Latin digits |

**The fixtures are rendered, not captured from a phone.** Crisp text, no camera
noise, no odd cropping. Real screenshots are harder, so every accuracy number
below is an upper bound on what a person will actually get.

## Results

<!-- filled from the ocr-compare workflow -->

## Which is primary, and why

<!-- decided from the table above -->
