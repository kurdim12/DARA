#!/usr/bin/env node
/**
 * One command to make the brand real once reference/brand/dara-mark.png exists:
 *
 *   npm run brand:sample
 *
 * It samples the exact cream from the mark's background so the mark sits on
 * the page with no visible box, writes that colour into src/styles/theme.css
 * and vite.config.ts, copies the mark to public/brand/, and renders the three
 * PWA icons. The mark itself is never redrawn, recoloured or traced.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, renderIcon } from "./png.mjs";

const root = new URL("../", import.meta.url);
const MARK = fileURLToPath(new URL("reference/brand/dara-mark.png", root));
const PUBLIC_MARK = fileURLToPath(new URL("public/brand/dara-mark.png", root));
const ICONS_DIR = fileURLToPath(new URL("public/icons/", root));
const THEME = fileURLToPath(new URL("src/styles/theme.css", root));
const VITE_CONFIG = fileURLToPath(new URL("vite.config.ts", root));
const INDEX_HTML = fileURLToPath(new URL("index.html", root));

if (!existsSync(MARK)) {
  console.error(`Missing ${MARK}`);
  console.error("Drop the brush-stroke درع there (see reference/README.md), then rerun.");
  process.exit(2);
}

const image = decodePng(await readFile(MARK));

/** The most common colour in the outer ring is the paper the mark sits on. */
function samplePaper(img) {
  const counts = new Map();
  const ring = Math.max(1, Math.round(Math.min(img.width, img.height) * 0.02));
  const consider = (x, y) => {
    const i = (y * img.width + x) * 4;
    if (img.data[i + 3] < 250) return;
    const key = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const onRing =
        x < ring || y < ring || x >= img.width - ring || y >= img.height - ring;
      if (onRing) consider(x, y);
    }
  }
  if (counts.size === 0) return null;
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best.split(",").map(Number);
}

const rgb = samplePaper(image);
if (!rgb) {
  console.error("The mark has a transparent border, so there is no paper colour to sample.");
  console.error("Set --paper #RRGGBB by hand in src/styles/theme.css instead.");
  process.exit(3);
}

const hex = `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

let theme = await readFile(THEME, "utf8");
theme = theme
  .replace(/--paper:\s*#[0-9a-fA-F]{6};.*$/m, `--paper: ${hex}; /* sampled from dara-mark.png */`)
  .replace(
    /^ \* --paper is a PLACEHOLDER[\s\S]*?visible box\. See DECISIONS\.md\.\n/m,
    " * --paper is sampled from reference/brand/dara-mark.png by\n * `npm run brand:sample`, so the mark sits on the page with no visible box.\n",
  );
await writeFile(THEME, theme, "utf8");

let viteConfig = await readFile(VITE_CONFIG, "utf8");
viteConfig = viteConfig.replace(/const PAPER = "#[0-9a-fA-F]{6}";/, `const PAPER = "${hex}";`);
await writeFile(VITE_CONFIG, viteConfig, "utf8");

// Browsers prefer this meta over the manifest for the status-bar chrome, so
// leaving it behind puts a visible seam at the top of the installed app.
let indexHtml = await readFile(INDEX_HTML, "utf8");
indexHtml = indexHtml.replace(
  /(<meta name="theme-color" content=")#[0-9a-fA-F]{6}(")/,
  `$1${hex}$2`,
);
await writeFile(INDEX_HTML, indexHtml, "utf8");

await mkdir(fileURLToPath(new URL("public/brand/", root)), { recursive: true });
await copyFile(MARK, PUBLIC_MARK);

await mkdir(ICONS_DIR, { recursive: true });
const icons = [
  { name: "icon-192.png", size: 192, coverage: 0.82 },
  { name: "icon-512.png", size: 512, coverage: 0.82 },
  // Maskable icons get cropped to a circle on some launchers, so keep the
  // mark inside the safe zone.
  { name: "icon-maskable-512.png", size: 512, coverage: 0.6 },
];
for (const icon of icons) {
  const rendered = renderIcon(image, icon.size, rgb, icon.coverage);
  await writeFile(`${ICONS_DIR}${icon.name}`, encodePng(rendered));
}

console.log(`paper = ${hex}  (from ${image.width}×${image.height} mark)`);
console.log("updated src/styles/theme.css, vite.config.ts and index.html");
console.log("copied public/brand/dara-mark.png");
console.log(`wrote ${icons.map((i) => i.name).join(", ")}`);
