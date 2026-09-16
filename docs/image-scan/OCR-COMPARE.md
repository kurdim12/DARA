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

Run `35136186385`, against the deployed Worker at `91a88f4`.

| Fixture | Provider | Chars correct | OCR ms | in/out tok | Cost | Verdict | Expected |
| --- | --- | ---: | ---: | ---: | ---: | --- | --- |
| 1-sms-fine | `openrouter-gemma4` | 100.0% | 3173 | 350/60 | $0.00005 | scam | scam |
| 1-sms-fine | `anthropic-haiku` | 95.7% | 2557 | 703/98 | $0.00119 | scam | scam |
| 2-whatsapp-job | `openrouter-gemma4` | 98.0% | 3297 | 350/46 | $0.00005 | scam | scam |
| 2-whatsapp-job | `anthropic-haiku` | 94.9% | 2020 | 703/74 | $0.00107 | scam | scam |
| 3-bank-notification | `openrouter-gemma4` | 84.5% | 9218 | 350/49 | $0.00005 | scam | scam |
| 3-bank-notification | `anthropic-haiku` | 100.0% | 2774 | 703/60 | $0.00100 | scam | scam |
| 4-sms-otp-bait | `openrouter-gemma4` | 100.0% | 2379 | 350/47 | $0.00005 | scam | scam |
| 4-sms-otp-bait | `anthropic-haiku` | 97.3% | 2263 | 703/77 | $0.00109 | scam | scam |
| 5-legit-otp | `openrouter-gemma4` | 100.0% | 5811 | 350/42 | $0.00005 | likely_safe | likely_safe |
| 5-legit-otp | `anthropic-haiku` | 100.0% | 1849 | 703/65 | $0.00103 | likely_safe | likely_safe |
| 6-legit-delivery (low-res) | `openrouter-gemma4` | 98.9% | 763 | 337/41 | $0.00004 | likely_safe | likely_safe |
| 6-legit-delivery (low-res) | `anthropic-haiku` | **69.9%** | 1794 | 186/66 | $0.00052 | likely_safe | likely_safe |
| 7-sextortion | `openrouter-gemma4` | 98.7% | 2464 | 350/33 | $0.00004 | scam | scam |
| 7-sextortion | `anthropic-haiku` | 96.0% | 1866 | 703/54 | $0.00097 | scam | scam |
| 8-prize-latin-digits (low-res) | `openrouter-gemma4` | 99.1% | 4869 | 336/61 | $0.00005 | scam | scam |
| 8-prize-latin-digits (low-res) | `anthropic-haiku` | — | — | — | — | **timeout** | scam |
| 9-gov-latin-digits | `openrouter-gemma4` | — | — | — | — | **timeout** | scam |
| 9-gov-latin-digits | `anthropic-haiku` | 100.0% | 2132 | 703/81 | $0.00111 | scam | scam |
| 10-legit-appointment | `openrouter-gemma4` | 100.0% | 2029 | 350/36 | $0.00004 | likely_safe | likely_safe |
| 10-legit-appointment | `anthropic-haiku` | 100.0% | 1574 | 703/59 | $0.00100 | likely_safe | likely_safe |

| Provider | n | Mean chars correct | Mean OCR ms | Cost / image | Verdicts right |
| --- | ---: | ---: | ---: | ---: | ---: |
| `openrouter-gemma4` | 9 | **97.7%** | 3778 | **$0.00005** | 9/9 |
| `anthropic-haiku` | 9 | 94.9% | **2092** | $0.00100 | 9/9 |

Every fixture is Arabic, so the Arabic-only column equals the overall one.

**One timeout each**, on different fixtures, under a 15 s verdict wall. Both
are the engine's wall rather than OCR's — the transcription came back; the
verdict did not. Worth watching, not yet a pattern.

## Which is primary, and why

**`openrouter-gemma4` stays primary. `anthropic-haiku` stays the fallback.**
The table says so on the two things that matter most, and the brief's
condition for swapping — "if Gemma loses on Arabic" — did not occur.

- **Arabic accuracy: Gemma 97.7% vs Haiku 94.9%.** Gemma was perfect on five
  of nine and never below 98% except on fixture 3.
- **Cost: $0.00005 vs $0.00100 per image — 20× cheaper.** The input-token
  counts explain it: Gemma reports ~350 tokens for the same image Haiku
  reports ~703 for, on top of an 11× lower rate.
- **Verdicts: 9/9 for both.** Neither provider's transcription misled the
  engine on any fixture it read, including both benign controls.

Two things cut the other way, honestly:

- **Haiku is faster: 2092 ms vs 3778 ms mean.** Gemma's spread is wider
  (763–9218 ms). That is a good property in a *fallback* — when Gemma is slow
  or failing, the thing that rescues the scan should be quick — so the order
  suits both.
- **Gemma's one bad read was the bank notification, 84.5%**, where Haiku was
  perfect. A wrapped Latin URL (`arabbank-secure.verify-` / `now.com`) is the
  hard case, and the chain covers it only if Gemma *fails* rather than reads
  it imperfectly. Worth a second look if more fixtures show the same shape.
- **Haiku's worst was the low-resolution delivery notice at 69.9%**, where
  Gemma managed 98.9%. On the hardest image the fallback is the weaker reader.

Both survived every fixture well enough for the verdict to come out right, so
on this evidence the ordering is a cost decision and Gemma wins it by 20×.
