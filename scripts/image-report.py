"""Print what one /api/analyze image response actually contains.

Kept as a file rather than a heredoc inside the workflow: a heredoc nested in
a YAML block scalar has to land its terminator at column 0 after YAML strips
the block's indentation, which is a trap nobody should have to re-derive.
"""
import json
import sys

path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/out.json"
raw = open(path, encoding="utf-8").read()

try:
    d = json.loads(raw)
except json.JSONDecodeError:
    print(f"  unparseable: {raw[:300]}")
    sys.exit(0)

if "error" in d:
    print(f"  ERROR: {d}")
    sys.exit(0)

usage = d.get("usage") or {}
print(f"  verdict     : {d.get('verdict')}  conf={d.get('confidence')}  cat={d.get('category')}")
print(f"  model       : {d.get('model')}  latency_ms={d.get('latency_ms')}")
print(f"  usage       : in={usage.get('input_tokens')} out={usage.get('output_tokens')}")
print(f"  transcribed : {(d.get('extracted_text') or '').replace(chr(10), ' / ')}")
