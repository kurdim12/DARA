#!/usr/bin/env node
/**
 * Writes src/demo/staged.json from the golden set's `demo: true` cases.
 *
 *   npm run demo:stage
 *
 * The app imports this instead of content/eval-cases.json so the full golden
 * set — every case and its expected verdict — stays out of the client bundle.
 * A test fails if the two drift apart.
 */
import { readFile, writeFile } from "node:fs/promises";

const CASES = new URL("../content/eval-cases.json", import.meta.url);
const OUT = new URL("../src/demo/staged.json", import.meta.url);
export const PLACEHOLDER = "REPLACE_WITH_EXACT_SMS_TEXT";

export async function stagedFromGoldenSet() {
  const file = JSON.parse(await readFile(CASES, "utf8"));
  return file.cases
    .filter((c) => c.demo === true && c.text !== PLACEHOLDER)
    .map(({ id, lang, text }) => ({ id, lang, text }));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const staged = await stagedFromGoldenSet();
  await writeFile(OUT, `${JSON.stringify(staged, null, 2)}\n`, "utf8");
  console.log(`wrote ${staged.length} staged message(s) to src/demo/staged.json`);
  for (const s of staged) console.log(`  ${s.id}`);
}
