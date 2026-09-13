# EVAL-REPORT.md

**Run on Sun 13 Sep 2026 against `https://dara.abdalrhmankurdi12.workers.dev`.
The engine's accuracy is still unmeasured, because the deployed Worker has no
API key.**

All 22 runnable cases returned, in 9–19 ms:

```json
{ "error": "server_error", "message": "engine not configured" }
```

That is `worker/index.ts:133`, the branch taken when `ANTHROPIC_API_KEY` is
not set on the Worker. The deployment's own
health endpoint agrees:

```
{"ok":true,"key_present":false,"db_ready":true,"model":"claude-sonnet-5"}
```

So: the site is up, D1 is bound and migrated, the model variable is right, and
the one thing missing is the secret. It can only be set in the Cloudflare
dashboard (Workers & Pages → `dara` → Settings → Variables and Secrets →
`ANTHROPIC_API_KEY`, type Secret), never from this repository.

The 23rd case, `gam_parking_fine`, did not run at all: its text is still
`REPLACE_WITH_EXACT_SMS_TEXT`.

## How this file is written

```bash
npm run eval -- --target https://dara.abdalrhmankurdi12.workers.dev --compare
```

No API key is needed to run it — the harness only ever talks to the Worker.
Since it needs network access to the deployment, it also runs in CI on every
push that touches the engine, the golden set or the harness
(`.github/workflows/eval.yml`), and uploads this file as an artifact. The next
run after the secret is set produces the real per-case table, the latency
percentiles, the Sonnet/Haiku comparison and the three weakest outputs quoted
in full, and exits non-zero if a critical rule fails.
