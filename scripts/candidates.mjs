#!/usr/bin/env node
/**
 * Lists the OpenRouter models that could actually run this engine.
 *
 *   node scripts/candidates.mjs
 *   node scripts/candidates.mjs --vendor google,openai --max-in 5
 *
 * The catalogue at https://openrouter.ai/api/v1/models is public — no key, so
 * this leaks nothing and costs nothing. It exists because "best model" is a
 * leaderboard question and this app has three hard requirements that most of
 * the leaderboard fails:
 *
 *   tools   — every scan forces tool_choice {type:"tool"}. A model without
 *             tool support cannot answer this app at all.
 *   image   — screenshot scans send a base64 image block.
 *   price   — a demo runs hundreds of scans; $/M matters.
 *
 * What it cannot tell you is the one that decides the demo: whether the model
 * quotes Arabic back verbatim so the red underlines land. Only the golden set
 * answers that — put the survivors in ANTHROPIC_MODEL_CANDIDATES and run
 * `npm run eval -- --compare`.
 */
const CATALOGUE = "https://openrouter.ai/api/v1/models";

function parseArgs(argv) {
  const args = { vendor: null, maxIn: null, json: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--vendor") args.vendor = argv[++i].split(",").map((v) => v.trim());
    else if (argv[i] === "--max-in") args.maxIn = Number(argv[++i]);
    else if (argv[i] === "--json") args.json = true;
  }
  return args;
}

/** Per million tokens. OpenRouter quotes per token, as a string. */
function perMillion(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n * 1_000_000 : null;
}

export function candidates(models, { vendor = null, maxIn = null } = {}) {
  return models
    .filter((m) => {
      const params = m.supported_parameters ?? [];
      const inputs = m.architecture?.input_modalities ?? [];
      if (!params.includes("tools")) return false;
      if (!inputs.includes("image")) return false;
      if (vendor && !vendor.includes(String(m.id).split("/")[0])) return false;
      const input = perMillion(m.pricing?.prompt);
      if (maxIn !== null && (input === null || input > maxIn)) return false;
      return true;
    })
    .map((m) => ({
      id: m.id,
      name: m.name ?? m.id,
      context: m.context_length ?? null,
      in: perMillion(m.pricing?.prompt),
      out: perMillion(m.pricing?.completion),
      forcesTools: (m.supported_parameters ?? []).includes("tool_choice"),
    }))
    .sort((a, b) => (a.in ?? Infinity) - (b.in ?? Infinity));
}

function table(rows) {
  const head = "| Model id | Context | $/M in | $/M out | Forced tool call |";
  const rule = "| --- | ---: | ---: | ---: | :---: |";
  const body = rows.map(
    (r) =>
      `| \`${r.id}\` | ${r.context?.toLocaleString() ?? "?"} | ${r.in?.toFixed(2) ?? "?"} | ${r.out?.toFixed(2) ?? "?"} | ${r.forcesTools ? "yes" : "**no**"} |`,
  );
  return [head, rule, ...body].join("\n");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const res = await fetch(CATALOGUE);
  if (!res.ok) {
    console.error(`the catalogue answered HTTP ${res.status}`);
    process.exit(1);
  }
  const { data } = await res.json();
  const rows = candidates(data, { vendor: args.vendor, maxIn: args.maxIn });

  if (args.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }

  console.log(`${data.length} models in the catalogue.`);
  console.log(`${rows.length} of them support both tool calling and image input.\n`);
  console.log(table(rows.slice(0, 40)));
  const noForce = rows.filter((r) => !r.forcesTools);
  if (noForce.length > 0) {
    console.log(
      `\n${noForce.length} of these advertise tools but not tool_choice. This engine forces a` +
        ` named tool call on every scan, so treat those as unproven until the golden set says otherwise.`,
    );
  }
  console.log(
    "\nNext: put two or three ids in ANTHROPIC_MODEL_CANDIDATES in wrangler.jsonc," +
      "\ndeploy, then run the eval workflow with --compare. The numbers choose.",
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
