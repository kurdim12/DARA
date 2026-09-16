# Phase 3 screenshots

Captured from a production build served by `vite preview` at 390×844,
device pixel ratio 2, on 16 September 2026.

`home-*`, `scan-*`, `radar-*`, `report-*`, `help-*`, `protect-*`, `learn-*`,
`recover-*`, `shield-*` are the app as it runs.

**`result-*.png` are not engine output.** The deployment has no
`ANTHROPIC_API_KEY`, so no real verdict can be produced. These were rendered by
intercepting `POST /api/analyze` in the browser and returning a hand-written
`AnalyzeResponse` — valid against `shared/types.ts`, built around the staged
Amman Municipality message in `content/eval-cases.json`. They show that the
screen lays out correctly for each verdict; they say nothing about what the
engine would actually answer, and they must not be shown to anyone as a
result the app produced.

| File | Verdict | What it is for |
| --- | --- | --- |
| `result-scam-{ar,en}.png` | `scam` | The full screen: three flagged spans, the Jordan layer, the link card, the documented-pattern card, the extraction table |
| `result-scam-{ar,en}-dark.png` | `scam` | The same in dark |
| `result-suspicious-{ar,en}.png` | `suspicious` | The amber band, two flags |
| `result-safe-{ar,en}.png` | `likely_safe` | The green band, no flags, and "Check another" as the primary action |
| `result-extortion-{ar,en}.png` | `scam`, routed | The third button, "Open the extortion shield" |

Once the key is set, replace these with real ones — the same four messages
through the live app.
