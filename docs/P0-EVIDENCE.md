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
