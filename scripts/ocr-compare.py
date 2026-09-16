#!/usr/bin/env python3
"""Run both OCR providers over the same screenshots, against the deployment.

Goes through /api/analyze with X-DARA-OCR rather than calling OpenRouter
directly, so no key is needed here and the numbers describe the app as it
actually runs. The deployment's OCR_PROVIDERS allowlist decides what can be
pinned; anything else silently runs the normal chain, which the table would
show as the wrong provider answering.
"""
import base64
import json
import subprocess
import sys
import time
from pathlib import Path

TARGET = sys.argv[1] if len(sys.argv) > 1 else "https://dara.abdalrhmankurdi12.workers.dev"
FIXTURES = Path(sys.argv[2] if len(sys.argv) > 2 else "docs/image-scan/fixtures")

# $/M in, $/M out — OpenRouter's public catalogue, read 2026-09-16.
PRICES = {
    "openrouter-gemma4": (0.09, 0.34),
    "anthropic-haiku": (1.00, 5.00),
}


def accuracy(expected: str, got: str) -> float:
    """Character accuracy against the known source, whitespace normalised.

    The fixtures render a known string, so 'characters correct' has an exact
    answer rather than a judgement call.
    """
    a = " ".join(expected.split())
    b = " ".join(got.split())
    if not a:
        return 0.0
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return max(0.0, 1 - prev[len(b)] / len(a))


def post(payload: str, provider: str) -> tuple[int, dict, int]:
    started = time.time()
    out = subprocess.run(
        ["curl", "-sS", "--max-time", "90", "-w", "\n%{http_code}",
         "-X", "POST", f"{TARGET}/api/analyze",
         "-H", "content-type: application/json",
         "-H", f"X-DARA-OCR: {provider}",
         "--data-binary", f"@{payload}"],
        capture_output=True, text=True,
    )
    ms = int((time.time() - started) * 1000)
    body, _, code = out.stdout.rpartition("\n")
    try:
        return int(code or 0), json.loads(body), ms
    except (ValueError, json.JSONDecodeError):
        return int(code or 0), {"error": "unparseable", "raw": body[:200]}, ms


def main() -> None:
    cases = json.loads((FIXTURES / "cases.json").read_text(encoding="utf-8"))
    rows = []
    for case in cases:
        b64 = base64.b64encode((FIXTURES / f"{case['id']}.jpg").read_bytes()).decode()
        payload = Path(f"/tmp/{case['id']}.json")
        payload.write_text(json.dumps(
            {"text": "", "lang": "ar", "type": "message",
             "image": {"media_type": "image/jpeg", "data": b64}}))
        for provider in PRICES:
            code, body, ms = post(str(payload), provider)
            got = body.get("extracted_text") or ""
            ocr = body.get("ocr") or {}
            answered = ocr.get("provider")
            usage = ocr.get("usage") or {}
            price_in, price_out = PRICES[provider]
            cost = (usage.get("input_tokens", 0) * price_in
                    + usage.get("output_tokens", 0) * price_out) / 1e6
            rows.append({
                "fixture": case["id"],
                "asked": provider,
                "answered": answered,
                "http": code,
                "accuracy": round(accuracy(case["body"], got), 4),
                "ocr_ms": ocr.get("ms"),
                "wall_ms": ms,
                "in": usage.get("input_tokens"),
                "out": usage.get("output_tokens"),
                "cost_usd": round(cost, 6),
                "verdict": body.get("verdict"),
                "expected": case.get("expect"),
                "error": body.get("error"),
                "text": got,
            })
            mark = "" if answered == provider else f"  !! answered by {answered}"
            print(f"{case['id']:<24} {provider:<18} http={code} "
                  f"acc={rows[-1]['accuracy']*100:5.1f}%  ocr={ocr.get('ms')}ms  "
                  f"verdict={body.get('verdict')}{mark}", file=sys.stderr)
        payload.unlink(missing_ok=True)
    print(json.dumps(rows, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
