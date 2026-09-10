# EVAL-REPORT.md

**Not run against a real engine yet.** This file is written by the eval harness,
against a deployed URL, because the API key lives only in the Worker.

```bash
npm run eval -- --target https://dara.<your-subdomain>.workers.dev --compare
```

That runs the golden cases on `claude-sonnet-5` and on `claude-haiku-4-5`,
applies the pass rules from `content/eval-cases.json`, and replaces this file
with the per-case table, the latency percentiles, the model comparison, and the
three weakest outputs quoted in full. It exits non-zero if any critical rule
fails, so it can gate a deploy.

The harness itself has been exercised end to end against a mock engine: it
detected a planted critical failure, reported the quote-match rate against the
95% rule, flagged the case below as unrunnable, and exited non-zero. What it has
never seen is a real verdict.

## Known gap before the first run

`gam_parking_fine` — the demo's main message — still has
`REPLACE_WITH_EXACT_SMS_TEXT` as its text in `content/eval-cases.json`.
`reference/gam-fake-fine.png` is not in the repo, so the SMS could not be
transcribed and must not be invented. The harness skips the case and flags it
as **AWAITING TEXT** at the top of the report.
