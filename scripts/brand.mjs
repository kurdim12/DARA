#!/usr/bin/env node
/**
 * Puts the real brand mark into the app:
 *
 *   npm run brand:apply
 *
 * Reads reference/brand/dara-mark.png, writes a web-sized copy to
 * public/brand/, and renders the three PWA icons from it. The mark itself is
 * never redrawn, recoloured or traced — only resized.
 *
 * It also samples the mark's background, but it will only adopt that colour as
 * the app's paper when the colour is actually paper: a light, near-neutral
 * tone. DARA's mark is white on #C40B29, and #C40B29 is the threat red. Taking
 * it as the page colour would paint the whole product in the one colour that
 * is supposed to mean danger, so in that case the palette is left alone.
 */
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { decodePng, encodePng, renderIcon, resize } from "./png.mjs";

const root = new URL("../", import.meta.url);
const MARK = fileURLToPath(new URL("reference/brand/dara-mark.png", root));
const PUBLIC_DIR = fileURLToPath(new URL("public/brand/", root));
const ICONS_DIR = fileURLToPath(new URL("public/icons/", root));
const THEME = fileURLToPath(new URL("src/styles/theme.css", root));
const VITE_CONFIG = fileURLToPath(new URL("vite.config.ts", root));
const INDEX_HTML = fileURLToPath(new URL("index.html", root));

/** The largest the mark is ever drawn is ~150 CSS px, so 512 is plenty. */
const WEB_SIZE = 512;

if (!existsSync(MARK)) {
  console.error(`Missing ${MARK}`);
  console.error("Drop the brush-stroke درع there (see reference/README.md), then rerun.");
  process.exit(2);
}

const image = decodePng(await readFile(MARK));

/** The most common colour in the outer ring is the field the mark sits on. */
function sampleBackground(img) {
  const counts = new Map();
  const ring = Math.max(1, Math.round(Math.min(img.width, img.height) * 0.02));
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const onRing = x < ring || y < ring || x >= img.width - ring || y >= img.height - ring;
      if (!onRing) continue;
      const i = (y * img.width + x) * 4;
      if (img.data[i + 3] < 250) continue;
      const key = `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  if (counts.size === 0) return null;
  const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best.split(",").map(Number);
}

const rgb = sampleBackground(image) ?? [244, 239, 230];
const hex = `#${rgb.map((v) => v.toString(16).padStart(2, "0")).join("")}`;

const [r, g, b] = rgb;
const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const chroma = (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
const looksLikePaper = luminance > 0.72 && chroma < 0.12;

await mkdir(PUBLIC_DIR, { recursive: true });
if (image.width > WEB_SIZE || image.height > WEB_SIZE) {
  const scale = WEB_SIZE / Math.max(image.width, image.height);
  const web = resize(image, Math.round(image.width * scale), Math.round(image.height * scale));
  await writeFile(`${PUBLIC_DIR}dara-mark.png`, encodePng(web));
  console.log(`public/brand/dara-mark.png — ${web.width}x${web.height} from ${image.width}x${image.height}`);
} else {
  await copyFile(MARK, `${PUBLIC_DIR}dara-mark.png`);
  console.log("public/brand/dara-mark.png — copied as delivered");
}

await mkdir(ICONS_DIR, { recursive: true });
const icons = [
  // The artwork is already square and full-bleed, so it is the icon.
  { name: "icon-192.png", size: 192, coverage: 1 },
  { name: "icon-512.png", size: 512, coverage: 1 },
  // Launchers crop a maskable icon to a circle, so the strokes pull inside the
  // safe zone while the field still bleeds to the edge.
  { name: "icon-maskable-512.png", size: 512, coverage: 0.8 },
  // iOS ignores the manifest's icons for the home screen and reads only
  // apple-touch-icon. Without this one, adding DARA' to an iPhone home screen
  // saves a screenshot of the page instead of the mark. It is drawn opaque
  // because iOS composites a transparent apple icon onto black.
  { name: "apple-touch-icon-180.png", size: 180, coverage: 1 },
];
for (const icon of icons) {
  await writeFile(`${ICONS_DIR}${icon.name}`, encodePng(renderIcon(image, icon.size, rgb, icon.coverage)));
}
console.log(`icons — ${icons.map((i) => i.name).join(", ")}`);

if (!looksLikePaper) {
  console.log(`\nMark background is ${hex} (luminance ${luminance.toFixed(2)}, chroma ${chroma.toFixed(2)}).`);
  console.log("That is not paper, so the palette was left alone: the page stays cream");
  console.log("and red keeps meaning threat. Nothing else to do.");
  process.exit(0);
}

for (const [path, pattern, replacement] of [
  [THEME, /--paper:\s*#[0-9a-fA-F]{6};.*$/m, `--paper: ${hex}; /* sampled from dara-mark.png */`],
  [VITE_CONFIG, /const PAPER = "#[0-9a-fA-F]{6}";/, `const PAPER = "${hex}";`],
  [INDEX_HTML, /(<meta name="theme-color" content=")#[0-9a-fA-F]{6}(")/, `$1${hex}$2`],
]) {
  const text = await readFile(path, "utf8");
  if (!pattern.test(text)) {
    console.error(`Could not find the colour to replace in ${path} — check it by hand.`);
    process.exit(3);
  }
  await writeFile(path, text.replace(pattern, replacement), "utf8");
}
console.log(`\npaper = ${hex} — updated theme.css, vite.config.ts and index.html`);
