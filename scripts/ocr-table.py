#!/usr/bin/env python3
"""Turn the comparison rows into the table that decides the primary."""
import json
import sys
from collections import defaultdict

rows = json.loads(open(sys.argv[1] if len(sys.argv) > 1 else "/tmp/rows.json", encoding="utf-8").read())

print("| Fixture | Provider | Chars correct | OCR ms | in/out tok | Cost | Verdict | Expected |")
print("| --- | --- | ---: | ---: | ---: | ---: | --- | --- |")
for r in rows:
    ok = "" if r["answered"] == r["asked"] else f" (answered by {r['answered']})"
    print(f"| {r['fixture']} | `{r['asked']}`{ok} | {r['accuracy']*100:.1f}% | "
          f"{r['ocr_ms'] or '—'} | {r['in'] or '—'}/{r['out'] or '—'} | "
          f"${r['cost_usd']:.5f} | {r['verdict'] or r.get('error') or '—'} | {r['expected']} |")

agg = defaultdict(lambda: {"n": 0, "acc": 0.0, "ms": 0, "cost": 0.0, "right": 0, "ar": 0, "ar_acc": 0.0})
for r in rows:
    if r["answered"] != r["asked"]:
        continue
    a = agg[r["asked"]]
    a["n"] += 1
    a["acc"] += r["accuracy"]
    a["ms"] += r["ocr_ms"] or 0
    a["cost"] += r["cost_usd"]
    if r["verdict"] == r["expected"]:
        a["right"] += 1
    # Every fixture here is Arabic; kept explicit so a Latin one added later
    # does not quietly dilute the number that matters.
    if any("؀" <= ch <= "ۿ" for ch in r["text"]):
        a["ar"] += 1
        a["ar_acc"] += r["accuracy"]

print()
print("| Provider | n | Mean chars correct | Arabic only | Mean OCR ms | Cost / image | Verdicts right |")
print("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
for name, a in agg.items():
    if not a["n"]:
        continue
    ar = f"{a['ar_acc']/a['ar']*100:.1f}%" if a["ar"] else "—"
    print(f"| `{name}` | {a['n']} | {a['acc']/a['n']*100:.1f}% | {ar} | "
          f"{a['ms']//a['n']} | ${a['cost']/a['n']:.5f} | {a['right']}/{a['n']} |")
