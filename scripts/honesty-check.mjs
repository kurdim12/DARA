#!/usr/bin/env node
/**
 * The definition of done says: grep the UI copy for claims a government jury
 * would probe, and review every hit.
 *
 *   npm run honesty
 *
 * A hit is not automatically wrong — it is something a person must read and
 * approve. The exit code is non-zero so this can gate a build.
 */
import { readFile } from "node:fs/promises";

const FILES = [
  "src/i18n/ar.json",
  "src/i18n/en.json",
  "worker/engine/prompt.ts",
];

const TERMS = [
  "السلطات",
  "الجرائم الإلكترونية",
  "مشفر",
  "مشفرة",
  "الجهات المختصة",
  "authorities",
  "encrypted",
  "Cybercrime",
  "cyber crime",
  "no data",
  "لا نحفظ",
];

let hits = 0;

for (const file of FILES) {
  const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
  const lines = text.split("\n");
  for (const term of TERMS) {
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        console.log(`${file}:${index + 1}  «${term}»  ${line.trim()}`);
        hits++;
      }
    });
  }
}

if (hits === 0) {
  console.log("No claims about authorities, encryption or data retention in the UI copy.");
  process.exit(0);
}
console.log(`\n${hits} line(s) need Abdelrahman's review before the demo build.`);
process.exit(1);
