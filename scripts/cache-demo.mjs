#!/usr/bin/env node
/**
 * Runs the final engine over the staged messages and saves the real outputs to
 * src/demo/cached-verdicts.json, for the airplane-mode fallback.
 *
 *   npm run cache-demo -- --target https://dara.<subdomain>.workers.dev
 *
 * These are genuine engine outputs, stamped with the model and the time they
 * were produced. The app shows them only for an exact staged message and only
 * when the live check cannot answer — and tags them "نتيجة محفوظة".
 */
import { readFile, writeFile } from "node:fs/promises";

const CASES_PATH = new URL("../content/eval-cases.json", import.meta.url);
const OUT_PATH = new URL("../src/demo/cached-verdicts.json", import.meta.url);
const PLACEHOLDER = "REPLACE_WITH_EXACT_SMS_TEXT";

const args = process.argv.slice(2);
const target = args[args.indexOf("--target") + 1];
const modelArg = args.includes("--model") ? args[args.indexOf("--model") + 1] : null;

if (!target || target.startsWith("--")) {
  console.error("usage: npm run cache-demo -- --target <deployed-url> [--model <id>]");
  process.exit(2);
}

const file = JSON.parse(await readFile(CASES_PATH, "utf8"));
const staged = file.cases.filter((c) => c.demo === true);

const verdicts = [];
const skipped = [];
let model = modelArg;

for (const testCase of staged) {
  if (testCase.text === PLACEHOLDER) {
    skipped.push(testCase.id);
    continue;
  }

  const headers = { "content-type": "application/json" };
  if (modelArg) headers["X-DARA-Model"] = modelArg;

  const res = await fetch(new URL("/api/analyze", target), {
    method: "POST",
    headers,
    body: JSON.stringify({
      text: testCase.text,
      lang: testCase.lang,
      channel: testCase.channel,
    }),
  });

  if (!res.ok) {
    console.error(`${testCase.id}: HTTP ${res.status} — not cached`);
    skipped.push(testCase.id);
    continue;
  }

  const body = await res.json();
  delete body.stats;
  model = model ?? body.model;
  verdicts.push({
    id: testCase.id,
    lang: testCase.lang,
    text: testCase.text,
    response: body,
  });
  console.log(`cached ${testCase.id} (${body.verdict}, ${body.latency_ms} ms)`);
  await new Promise((r) => setTimeout(r, 2100));
}

const out = {
  _meta: {
    generated_at: new Date().toISOString(),
    model: model ?? null,
    note: "Real engine outputs for the staged messages, written by `npm run cache-demo`. Shown only for an exact staged message when the live check is offline, errored, or slower than 8 s, and always tagged as a saved result.",
  },
  verdicts,
};

await writeFile(OUT_PATH, `${JSON.stringify(out, null, 2)}\n`, "utf8");
console.log(`\nwrote ${verdicts.length} cached verdict(s) to src/demo/cached-verdicts.json`);
if (skipped.length) console.log(`skipped: ${skipped.join(", ")}`);
