#!/usr/bin/env node
/**
 * Runs the golden set against a deployed DARA' and writes EVAL-REPORT.md.
 *
 *   npm run eval -- --target https://dara.<subdomain>.workers.dev
 *   npm run eval -- --target <url> --model claude-haiku-4-5
 *   npm run eval -- --target <url> --compare        # both candidates
 *
 * It talks to the deployed URL on purpose: the API key lives only in the
 * Worker, so no key is ever needed on this machine.
 */
import { readFile, writeFile } from "node:fs/promises";

const CASES_PATH = new URL("../content/eval-cases.json", import.meta.url);
const REPORT_PATH = new URL("../EVAL-REPORT.md", import.meta.url);
const PLACEHOLDER = "REPLACE_WITH_EXACT_SMS_TEXT";
const DEFAULT_MODELS = ["claude-sonnet-5", "claude-haiku-4-5"];
const ARABIC = /[؀-ۿ]/;

function parseArgs(argv) {
  const args = { target: null, models: null, compare: false, only: null, gap: 2100 };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flag === "--target") args.target = argv[++i];
    else if (flag === "--model") args.models = [argv[++i]];
    else if (flag === "--compare") args.compare = true;
    else if (flag === "--only") args.only = argv[++i];
    else if (flag === "--gap") args.gap = Number(argv[++i]);
  }
  if (!args.models) args.models = args.compare ? DEFAULT_MODELS : [DEFAULT_MODELS[0]];
  return args;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

async function callAnalyze(target, model, testCase) {
  const started = Date.now();
  const res = await fetch(new URL("/api/analyze", target), {
    method: "POST",
    headers: { "content-type": "application/json", "X-DARA-Model": model },
    body: JSON.stringify({
      text: testCase.text,
      lang: testCase.lang,
      channel: testCase.channel,
    }),
  });
  const wall = Date.now() - started;
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  return { status: res.status, body, wall };
}

/** The pass rules live in content/eval-cases.json `_meta.pass_rules`. */
function judge(testCase, result) {
  const problems = [];
  const warnings = [];

  if (result.status !== 200 || !result.body?.verdict) {
    problems.push(`HTTP ${result.status}${result.body?.error ? ` (${result.body.error})` : ""}`);
    return { problems, warnings, critical: true };
  }

  const got = result.body.verdict;
  const accepted = testCase.accept ?? [testCase.expect];
  const expect = testCase.expect;

  if (expect === "scam" && got === "likely_safe") {
    problems.push("CRITICAL: expected scam, returned likely_safe");
  } else if (expect === "likely_safe" && got === "scam") {
    problems.push("CRITICAL: expected likely_safe, returned scam");
  } else if (!accepted.includes(got)) {
    if (expect === "scam" && got === "suspicious") {
      warnings.push("expected scam, returned suspicious");
    } else {
      warnings.push(`expected ${expect}, returned ${got}`);
    }
  }

  if (testCase.expect_category && result.body.category !== testCase.expect_category) {
    warnings.push(`category ${result.body.category}, expected ${testCase.expect_category}`);
  }

  if (result.body.category === "extortion" && result.body.route_to_shield !== true) {
    problems.push("CRITICAL: extortion did not route to Shield");
  }

  const headline = String(result.body.headline ?? "");
  const hasArabic = ARABIC.test(headline);
  if (testCase.lang === "ar" && !hasArabic) {
    problems.push("CRITICAL: lang=ar but the headline is not Arabic");
  }
  if (testCase.lang === "en" && hasArabic) {
    problems.push("CRITICAL: lang=en but the headline contains Arabic");
  }

  return {
    problems,
    warnings,
    critical: problems.some((p) => p.startsWith("CRITICAL")) || problems.length > 0,
  };
}

async function runModel(target, model, cases, gap) {
  const rows = [];
  for (const testCase of cases) {
    if (testCase.text === PLACEHOLDER) {
      rows.push({ id: testCase.id, skipped: "AWAITING TEXT", testCase });
      continue;
    }

    let result = await callAnalyze(target, model, testCase);
    // The deployment rate-limits per IP; back off rather than record a false failure.
    for (let attempt = 0; attempt < 3 && result.status === 429; attempt++) {
      await sleep(4000 * (attempt + 1));
      result = await callAnalyze(target, model, testCase);
    }

    const verdictLine = judge(testCase, result);
    const stats = result.body?.stats ?? {};
    const returned = stats.flags_returned ?? 0;
    const matched = returned - (stats.dropped_unmatched ?? 0);

    rows.push({
      id: testCase.id,
      testCase,
      result,
      ...verdictLine,
      flagsReturned: returned,
      flagsMatched: matched,
      flagsKept: stats.flags_kept ?? 0,
      droppedActions: stats.dropped_actions ?? 0,
    });

    process.stdout.write(
      `${verdictLine.critical ? "FAIL" : verdictLine.warnings.length ? "warn" : "ok  "} ${testCase.id} (${result.wall} ms)\n`,
    );
    await sleep(gap);
  }
  return rows;
}

function summarize(model, rows) {
  const ran = rows.filter((r) => !r.skipped);
  const latencies = ran.map((r) => r.result.wall);
  const totalReturned = ran.reduce((sum, r) => sum + r.flagsReturned, 0);
  const totalMatched = ran.reduce((sum, r) => sum + r.flagsMatched, 0);
  return {
    model,
    cases: ran.length,
    skipped: rows.length - ran.length,
    criticalFailures: ran.filter((r) => r.critical).length,
    warnings: ran.filter((r) => !r.critical && r.warnings.length).length,
    p50: percentile(latencies, 50),
    p90: percentile(latencies, 90),
    quoteMatchRate: totalReturned === 0 ? 1 : totalMatched / totalReturned,
  };
}

function table(rows) {
  const head =
    "| case | expected | got | conf | category | latency | flags kept/dropped | notes |\n" +
    "|---|---|---|---|---|---|---|---|";
  const body = rows
    .map((r) => {
      if (r.skipped) {
        return `| ${r.id} | ${r.testCase.expect} | — | — | — | — | — | **${r.skipped}** |`;
      }
      const b = r.result.body ?? {};
      const dropped =
        (r.flagsReturned ?? 0) - (r.flagsKept ?? 0) + 0;
      const notes = [...r.problems, ...r.warnings].join("; ") || "—";
      return `| ${r.id} | ${r.testCase.expect} | ${b.verdict ?? "—"} | ${b.confidence ?? "—"} | ${b.category ?? "—"} | ${r.result.wall} ms | ${r.flagsKept}/${dropped} | ${notes} |`;
    })
    .join("\n");
  return `${head}\n${body}`;
}

function weakest(rows) {
  return rows
    .filter((r) => !r.skipped)
    .map((r) => ({
      row: r,
      score:
        (r.critical ? 1000 : 0) +
        (r.warnings.length ? 100 : 0) +
        (r.flagsReturned - r.flagsMatched) * 10 +
        (100 - (r.result.body?.confidence ?? 100)) / 100,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ row }) => row);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.target) {
    console.error("usage: npm run eval -- --target <deployed-url> [--model <id>] [--compare]");
    process.exit(2);
  }

  const file = JSON.parse(await readFile(CASES_PATH, "utf8"));
  const cases = args.only
    ? file.cases.filter((c) => c.id === args.only)
    : file.cases;

  const runs = [];
  for (const model of args.models) {
    console.log(`\n— ${model} —`);
    const rows = await runModel(args.target, model, cases, args.gap);
    runs.push({ model, rows, summary: summarize(model, rows) });
  }

  const awaiting = cases.filter((c) => c.text === PLACEHOLDER).map((c) => c.id);
  const now = new Date().toISOString();

  let md = `# EVAL-REPORT.md\n\nRun ${now} against \`${args.target}\`.\n\n`;

  if (awaiting.length) {
    md += `> **${awaiting.length} case(s) could not run: ${awaiting.join(", ")}.**\n> The text is still \`${PLACEHOLDER}\` in content/eval-cases.json.\n\n`;
  }

  md += "## Summary\n\n";
  md += "| model | cases | critical failures | warnings | p50 | p90 | quotes matched |\n|---|---|---|---|---|---|---|\n";
  for (const run of runs) {
    const s = run.summary;
    md += `| ${s.model} | ${s.cases} | ${s.criticalFailures} | ${s.warnings} | ${s.p50} ms | ${s.p90} ms | ${(s.quoteMatchRate * 100).toFixed(1)}% |\n`;
  }

  const pass = runs.every((r) => r.summary.criticalFailures === 0);
  const quotesOk = runs.every((r) => r.summary.quoteMatchRate >= 0.95);
  md += `\n**Deploy gate:** ${pass ? "no critical failures" : "BLOCKED — critical failures above"}. `;
  md += `Quote match rule (95%): ${quotesOk ? "met" : "NOT met"}.\n`;

  if (runs.length > 1) {
    const [a, b] = runs;
    const faster = a.summary.p90 <= b.summary.p90 ? a : b;
    md += `\n## Model comparison\n\n`;
    md += `\`${faster.summary.model}\` has the lower p90 (${faster.summary.p90} ms vs ${(faster === a ? b : a).summary.p90} ms).\n`;
    md += runs
      .filter((r) => r.summary.criticalFailures === 0)
      .map((r) => `- \`${r.summary.model}\` passes every critical rule.`)
      .join("\n");
    md += `\n\nAbdelrahman chooses. Set it with the \`ANTHROPIC_MODEL\` var in wrangler.jsonc.\n`;
  }

  for (const run of runs) {
    md += `\n## ${run.model}\n\n${table(run.rows)}\n`;
    md += `\n### Weakest three outputs\n`;
    for (const row of weakest(run.rows)) {
      const b = row.result.body ?? {};
      md += `\n#### ${row.id}\n\n`;
      md += "```\n";
      md += `MESSAGE: ${row.testCase.text}\n\n`;
      md += JSON.stringify(b, null, 2);
      md += "\n```\n";
    }
  }

  await writeFile(REPORT_PATH, md, "utf8");
  console.log(`\nwrote EVAL-REPORT.md — ${pass ? "no critical failures" : "CRITICAL FAILURES"}`);
  process.exit(pass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
