#!/usr/bin/env python3
"""Ten consecutive type=link scans against the deployment, with latencies.

This is P0-1's acceptance test and its baseline both. It records, per scan:
the HTTP status, the wall time the caller saw, the engine's own latency_ms,
which model answered, and whether the result is usable at all.

"Useful" means a verdict came back — full or preliminary. A 504 with
«تعذّر إكمال الفحص» is a dead end and counts as a failure.
"""
import json
import subprocess
import sys
import time

TARGET = sys.argv[1] if len(sys.argv) > 1 else "https://dara.abdalrhmankurdi12.workers.dev"

# Ten link-shaped inputs. The first three are the staged demo links; the rest
# are shapes a Jordanian user actually pastes. None is opened, ever.
LINKS = [
    "http://amanat-amman-pay.com/fine",
    "http://arabbank-secure.verify-now.com",
    "https://jo-gov-services.com/renew",
    "http://zain-jo-offers.net/win",
    "https://orange-jo.support-verify.com",
    "http://umniah-rewards.co/claim",
    "https://www.jordanpost-delivery.info/track",
    "http://cliq-jo-transfer.com/confirm",
    "https://moi-jo-update.com/data",
    "http://e-fawateercom-pay.net/bill",
]


def scan(url: str) -> dict:
    payload = json.dumps({"text": url, "lang": "ar", "type": "link"})
    started = time.time()
    out = subprocess.run(
        ["curl", "-sS", "--max-time", "60", "-w", "\n%{http_code}",
         "-X", "POST", f"{TARGET}/api/analyze",
         "-H", "content-type: application/json",
         "--data-binary", payload],
        capture_output=True, text=True,
    )
    wall = int((time.time() - started) * 1000)
    body, _, code = out.stdout.rpartition("\n")
    try:
        d = json.loads(body)
    except json.JSONDecodeError:
        d = {"error": "unparseable", "raw": body[:160]}
    return {
        "url": url,
        "http": int(code or 0),
        "wall_ms": wall,
        "latency_ms": d.get("latency_ms"),
        "model": d.get("model"),
        "verdict": d.get("verdict"),
        "preliminary": d.get("preliminary", False),
        "error": d.get("error"),
        # Useful = the user got an answer, full or preliminary.
        "useful": bool(d.get("verdict")),
    }


def main() -> None:
    rows = [scan(u) for u in LINKS]
    useful = sum(1 for r in rows if r["useful"])
    lat = [r["latency_ms"] for r in rows if r["latency_ms"]]
    walls = sorted(r["wall_ms"] for r in rows)

    print("| # | Link | HTTP | wall ms | engine latency_ms | model | verdict |")
    print("| ---: | --- | ---: | ---: | ---: | --- | --- |")
    for i, r in enumerate(rows, 1):
        host = r["url"].split("//", 1)[-1].split("/", 1)[0]
        v = r["verdict"] or f"**{r['error'] or 'none'}**"
        if r["preliminary"]:
            v += " (preliminary)"
        print(f"| {i} | `{host}` | {r['http']} | {r['wall_ms']} | {r['latency_ms'] or '—'} "
              f"| {r['model'] or '—'} | {v} |")
    print()
    print(f"**{useful}/10 useful.** wall min {walls[0]} / median {walls[len(walls)//2]} / max {walls[-1]} ms")
    if lat:
        s = sorted(lat)
        print(f"engine latency_ms: min {s[0]} / median {s[len(s)//2]} / max {s[-1]}")
    print()
    print(json.dumps(rows, ensure_ascii=False))


if __name__ == "__main__":
    main()
