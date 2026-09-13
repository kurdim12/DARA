#!/usr/bin/env node
/**
 * The definition of done says: grep the UI copy for claims a government jury
 * would probe, and review every hit.
 *
 *   npm run honesty
 *
 * A hit is not automatically wrong — it is something a person must read and
 * approve. The exit code is non-zero so this can gate a build.
 *
 * The Phase 0 audit found this gate had passed while an unsourced statement
 * about Jordanian law was rendering in Shield (AUDIT.md, A5/A6). It had two
 * blind spots: it never read the file the Shield copy actually lives in, and
 * it had no legal or statistical terms. Both are closed below.
 */
import { readFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";

const ROOT = new URL("../", import.meta.url);

/** Files scanned line by line for the claims v1 used to make. */
const FILES = [
  "src/i18n/ar.json",
  "src/i18n/en.json",
  "worker/engine/prompt.ts",
];

/** Claims about who receives a report, and about encryption or retention. */
const CLAIM_TERMS = [
  "السلطات",
  "الجهات المختصة",
  "الجرائم الإلكترونية",
  "تم إرسال",
  "تم إبلاغ",
  "تم إخطار",
  "مشفر",
  "مشفرة",
  "authorities",
  "encrypted",
  "Cybercrime",
  "cyber crime",
  "no data",
  "لا نحفظ",
  "لا نخزن",
];

/**
 * A statement about a law, a penalty or a number is only allowed to render if
 * someone has checked it against an official source. In the content file that
 * means the object it sits in carries `verified`.
 */
const SOURCED_TERMS = [
  "القانون الأردني",
  "قانون الجرائم",
  "يعاقب",
  "عقوبة",
  "غرامة",
  "سجن",
  "المادة ",
  "Jordanian law",
  "penalty",
  "imprisonment",
];

/** Four digits or more, or an international prefix: a number to be sourced. */
const NUMBER_LIKE = /(\+\d{3}|\d[\d\s-]{3,})/;

let hits = 0;

function report(where, why, line) {
  console.log(`${where}  «${why}»  ${line}`);
  hits++;
}

async function scanLines(file) {
  const text = await readFile(new URL(file, ROOT), "utf8");
  text.split("\n").forEach((line, index) => {
    for (const term of CLAIM_TERMS) {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        report(`${file}:${index + 1}`, term, line.trim());
      }
    }
  });
}

/** Every .tsx under a directory, so inline strings are scanned too. */
async function tsxFiles(dir) {
  const entries = await readdir(new URL(dir, ROOT), { withFileTypes: true });
  return entries.filter((e) => e.isFile() && e.name.endsWith(".tsx")).map((e) => `${dir}${e.name}`);
}

/**
 * Walks the content file. A subtree marked `verified: false` is skipped: it
 * cannot reach a production build, so it cannot mislead anyone. Everything
 * else is copy that renders, and is held to both rules.
 */
function walkContent(node, path, out) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => walkContent(item, `${path}[${index}]`, out));
    return;
  }
  if (node === null || typeof node !== "object") return;

  if (node.verified === false) return; // gated: never renders in production
  if (path === "" ) {
    for (const [key, value] of Object.entries(node)) {
      // `_meta` is notes to ourselves; `rewrite_required` is a record of the
      // v1 strings we threw out, quoted so nobody reinstates them.
      if (key === "_meta" || key === "rewrite_required") continue;
      walkContent(value, key, out);
    }
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (key === "note" || key === "origin" || key === "problem" || key === "why_not_ai") continue;
    if (typeof value === "string") {
      out.push({ path: `${path}.${key}`, value, gated: "verified" in node });
    } else {
      walkContent(value, `${path}.${key}`, out);
    }
  }
}

for (const file of FILES) await scanLines(file);
for (const file of await tsxFiles("src/routes/")) await scanLines(file);
for (const file of await tsxFiles("src/components/")) await scanLines(file);

const content = JSON.parse(await readFile(new URL("content/v1-content.json", ROOT), "utf8"));
const strings = [];
walkContent(content, "", strings);

for (const { path, value } of strings) {
  for (const term of CLAIM_TERMS) {
    if (value.toLowerCase().includes(term.toLowerCase())) {
      report(`content/v1-content.json ${path}`, term, value.slice(0, 90));
    }
  }
  const sourced = SOURCED_TERMS.find((term) => value.includes(term));
  if (sourced) {
    report(
      `content/v1-content.json ${path}`,
      `${sourced} — renders with no verified flag`,
      value.slice(0, 90),
    );
  }
  if (NUMBER_LIKE.test(value)) {
    report(
      `content/v1-content.json ${path}`,
      "number renders with no verified flag",
      value.slice(0, 90),
    );
  }
}

if (hits === 0) {
  console.log(
    `No authority, encryption or retention claims in the UI copy, and nothing in ${strings.length} renderable content strings states a law, a penalty or a number without a verified flag.`,
  );
  process.exit(0);
}

console.log(`\n${hits} thing(s) above need a person to read them.`);
process.exit(1);
