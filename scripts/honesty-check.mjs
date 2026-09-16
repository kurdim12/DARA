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

/**
 * Claims that are wrong no matter who signed them off: DARA' saying a report
 * was sent, received or notified, or saying anything about encryption or
 * retention that is not literally true. Absolute, in every file.
 */
const CLAIM_TERMS = [
  "تم إرسال",
  "تم إبلاغ",
  "تم إخطار",
  "مشفر",
  "مشفرة",
  "encrypted",
  "no data",
  "لا نحفظ",
  "لا نخزن",
];

/**
 * The NAME of an official body. Naming one is not a claim that anything was
 * sent to it — "the Jordan Times, quoting the Cybercrime Unit" attributes a
 * warning, and the entities directory is a list of who a scam impersonates.
 *
 * So these are answerable by a `verified: true` record, which is a person's
 * signature on a sourced fact. They are NOT answerable anywhere else: the
 * i18n files carry no verified flags, so in the app's own voice a body's name
 * still stops the build unless it is in APPROVED below with a written reason.
 *
 * The sending verbs above stay absolute either way, so a verified record that
 * said "تم إبلاغ وحدة الجرائم الإلكترونية" would still fail.
 */
const ENTITY_NAME_TERMS = [
  "السلطات",
  "الجهات المختصة",
  "الجهة المختصة",
  "الجرائم الإلكترونية",
  "authorities",
  "Cybercrime",
  "cyber crime",
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

/**
 * Copy a person has read and approved, by i18n key. A term on any OTHER line
 * still fails the build — this list is the record of what was approved and
 * why, not a way to turn the check off.
 */
const APPROVED = {
  "error.too_long":
    "The 2,000 is DARA's own input cap — a true statement about itself, not a fact about the world.",
  "shield.call_now":
    "Contains 911. The button carrying it renders only when content/verified.json marks the emergency contact verified, and Shield has no other path to it; while that flag is false the screen shows 'Emergency number pending verification' instead. The number in this label is therefore gated by the same flag as the number it dials.",
  "authority.cybercrime_unit":
    "A label in the 'relevant authority (for your reference)' list. Naming a body is not a claim that anything was sent to it, and the confirmation screen says in so many words that nothing was.",
  "report.pilot_note":
    "The confirmation sentence. It contains 'authority' and 'forwarded' because it is the denial: the report is stored on DARA' and has NOT been forwarded.",
};

/**
 * A term inside an identifier is not copy. `cybercrime_unit` and
 * `RELEVANT_AUTHORITIES` are symbols the compiler reads, not sentences anyone
 * sees, and flagging them trains people to ignore this check.
 */
function insideIdentifier(line, term) {
  const at = line.toLowerCase().indexOf(term.toLowerCase());
  if (at === -1) return false;
  const before = line[at - 1] ?? "";
  const after = line[at + term.length] ?? "";
  return before === "_" || after === "_";
}

function approvedKeyOn(line) {
  const match = line.match(/"([a-z0-9_.]+)"\s*:/i);
  return match && match[1] in APPROVED ? match[1] : null;
}

let hits = 0;

function report(where, why, line) {
  console.log(`${where}  «${why}»  ${line}`);
  hits++;
}

async function scanLines(file) {
  const text = await readFile(new URL(file, ROOT), "utf8");
  text.split("\n").forEach((line, index) => {
    for (const term of [...CLAIM_TERMS, ...ENTITY_NAME_TERMS]) {
      if (!line.toLowerCase().includes(term.toLowerCase())) continue;
      if (insideIdentifier(line, term)) continue;
      if (approvedKeyOn(line)) continue;
      report(`${file}:${index + 1}`, term, line.trim());
    }

    // The app's own copy carries no `verified` flag to gate a number with, so
    // a number in a UI string has to be approved by key with a reason. This
    // is where an invented phone number would otherwise walk in — the exact
    // thing the jury will check.
    if (!file.endsWith(".json")) return;
    const value = line.slice(line.indexOf(":") + 1);
    if (!NUMBER_LIKE.test(value)) return;
    // A placeholder like {d} or {0} is filled at render time from data that
    // is gated where it lives.
    if (/\{\w*\}/.test(value)) return;
    if (approvedKeyOn(line)) return;
    report(`${file}:${index + 1}`, "number in UI copy", line.trim());
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
/**
 * Key names a file has declared as quoted specimens — an invented example of a
 * scam message, shown so a person can learn to recognise it. A specimen is not
 * the app speaking, so the fake numbers inside it are exempt. Every other
 * string in the same file is still held to the rule.
 */
function specimenKeys(content) {
  const declared = content?._meta?.specimens;
  return Array.isArray(declared) ? new Set(declared) : new Set();
}

function walkContent(node, path, out, specimens = new Set()) {
  if (Array.isArray(node)) {
    node.forEach((item, index) => walkContent(item, `${path}[${index}]`, out, specimens));
    return;
  }
  if (node === null || typeof node !== "object") return;

  if (node.verified === false) return; // gated: never renders in production
  if (path === "" ) {
    for (const [key, value] of Object.entries(node)) {
      // `_meta` is notes to ourselves; `rewrite_required` is a record of the
      // v1 strings we threw out, quoted so nobody reinstates them.
      if (key === "_meta" || key === "rewrite_required") continue;
      walkContent(value, key, out, specimens);
    }
    return;
  }

  for (const [key, value] of Object.entries(node)) {
    if (
      key === "note" ||
      key === "origin" ||
      key === "problem" ||
      key === "why_not_ai" ||
      key === "rule" ||
      key === "purpose" ||
      key === "titles" ||
      key === "balance" ||
      key === "state" ||
      key === "specimens_note" ||
      // Structural, not prose: an id, a date, a URL and a domain carry digits
      // without stating anything. The claim, if there is one, is in the text.
      key === "id" ||
      key === "date" ||
      key === "domain" ||
      key === "official_domain" ||
      key === "source_url" ||
      key === "source_url_2" ||
      key === "tld"
    ) {
      continue;
    }
    if (specimens.has(key)) continue;
    if (typeof value === "string") {
      out.push({ path: `${path}.${key}`, value, gated: "verified" in node });
    } else {
      walkContent(value, `${path}.${key}`, out, specimens);
    }
  }
}

for (const file of FILES) await scanLines(file);
for (const file of await tsxFiles("src/routes/")) await scanLines(file);
for (const file of await tsxFiles("src/components/")) await scanLines(file);

/**
 * Every JSON file under content/, found by walking rather than by list.
 *
 * This used to be a hardcoded array, and a hardcoded array is how a content
 * file gets added without the gate ever reading it — which is the exact blind
 * spot the Phase 0 audit caught the first time. A new file is now inside the
 * gate the moment it exists.
 */
async function contentFiles(dir = "content/") {
  const entries = await readdir(new URL(dir, ROOT), { withFileTypes: true });
  const out = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory()) out.push(...(await contentFiles(`${dir}${entry.name}/`)));
    else if (entry.name.endsWith(".json")) out.push(`${dir}${entry.name}`);
  }
  return out;
}

const CONTENT_FILES = await contentFiles();
const strings = [];
for (const file of CONTENT_FILES) {
  const content = JSON.parse(await readFile(new URL(file, ROOT), "utf8"));
  const found = [];
  walkContent(content, "", found, specimenKeys(content));
  for (const entry of found) strings.push({ ...entry, file });
}

for (const { file, path, value, gated } of strings) {
  for (const term of CLAIM_TERMS) {
    if (value.toLowerCase().includes(term.toLowerCase())) {
      report(`${file} ${path}`, term, value.slice(0, 90));
    }
  }
  if (!gated) {
    for (const term of ENTITY_NAME_TERMS) {
      if (value.toLowerCase().includes(term.toLowerCase())) {
        report(`${file} ${path}`, term, value.slice(0, 90));
      }
    }
  }
  if (gated) continue; // a person has signed this record off; see above

  const sourced = SOURCED_TERMS.find((term) => value.includes(term));
  if (sourced) {
    report(`${file} ${path}`, `${sourced} — renders with no verified flag`, value.slice(0, 90));
  }
  if (NUMBER_LIKE.test(value)) {
    report(`${file} ${path}`, "number renders with no verified flag", value.slice(0, 90));
  }
}

if (hits === 0) {
  console.log(
    `No authority, encryption or retention claims in the UI copy, and nothing in ${strings.length} renderable content strings across ${CONTENT_FILES.length} content files states a law, a penalty or a number without a verified flag.`,
  );
  process.exit(0);
}

console.log(`\n${hits} thing(s) above need a person to read them.`);
process.exit(1);
