#!/usr/bin/env node
/**
 * Renders the app icons from the mark:
 *
 *   node scripts/icons.mjs
 *
 * The white brush درع, centred on the brand red. The mark is never redrawn,
 * recoloured or traced — public/brand/dara-mark-white.png is the stroke on
 * transparency, and the red comes from underneath it, which is the same way
 * the header tile is built.
 *
 * The maskable icon keeps 20% clear on every side, because a launcher is free
 * to crop a circle out of it and a cropped brush stroke is a smudge.
 */
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, renderIcon } from "./png.mjs";

const root = new URL("../", import.meta.url);
const RED = [0xc4, 0x0c, 0x29];

const mark = decodePng(
  await readFile(fileURLToPath(new URL("public/brand/dara-mark-white.png", root))),
);

const ICONS = [
  ["public/icons/icon-512.png", 512, 0.68],
  ["public/icons/icon-192.png", 192, 0.68],
  ["public/icons/apple-touch-icon-180.png", 180, 0.64],
  // 60% of the edge leaves the 20% safe margin a maskable icon needs.
  ["public/icons/icon-maskable-512.png", 512, 0.6],
];

for (const [path, size, coverage] of ICONS) {
  const png = encodePng(renderIcon(mark, size, RED, coverage));
  await writeFile(fileURLToPath(new URL(path, root)), png);
  console.log(`${path}  ${size}×${size}  mark at ${Math.round(coverage * 100)}%`);
}
