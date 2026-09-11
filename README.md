# DARA' (درع) v2

Arabic-first app that tells a person in Jordan, in seconds, whether a message
they received is a scam, and lets them report it anonymously.

One Cloudflare Worker serves the React app and the API from the same origin.
The detection engine calls Claude from the Worker; the key never leaves it.

- **[CLAUDE.md](CLAUDE.md)** — the standing brief: honesty rules, security
  rules, and the design identity. Read first.
- **[BUILD.md](BUILD.md)** — phases, specs, engine prompt, copy table, gates.
- **[DEPLOY.md](DEPLOY.md)** — the six commands to get a URL on a phone.
- **[DECISIONS.md](DECISIONS.md)** — every default chosen, one line each.
- **[DEMO-RUNBOOK.md](DEMO-RUNBOOK.md)** — the demo click path and failure moves.

## Commands

| | |
|---|---|
| `npm run dev` | App and Worker on http://localhost:5173 |
| `npm run verify` | Typecheck, unit tests, honesty grep, production build |
| `npm run deploy` | Build and deploy to Cloudflare |
| `npm run eval -- --target <url> --compare` | Golden set on both candidate models → `EVAL-REPORT.md` |
| `npm run cache-demo -- --target <url>` | Record the staged messages' verdicts for the offline fallback |
| `npm run brand:apply` | Put the brand mark into the app and render the PWA icons |

## Layout

```
worker/      the API and the detection engine (worker/engine/prompt.ts is the judgment)
src/         the React app: routes, i18n, components
shared/      types both sides agree on
content/     v1 content with verification flags, and the eval golden set
migrations/  the D1 schema
scripts/     eval harness, demo cache, brand tooling, honesty grep
test/        unit tests for quote matching and post-validation
```
