import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
const EXE = "/opt/pw-browsers/chromium-1194/chrome-linux/chrome";
const BASE = process.env.BASE ?? "http://localhost:4501";
const OUT = process.env.OUT ?? "/tmp/look";
const size = { width: 390, height: 844 };
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: EXE });
const ctx = await browser.newContext({ viewport: size, deviceScaleFactor: 2 });
const page = await ctx.newPage();
await page.addInitScript((m) => {
  sessionStorage.setItem("dara.theme", m.includes("dark") ? "dark" : "light");
  sessionStorage.setItem("dara.lang", m.startsWith("ar") ? "ar" : "en");
}, process.env.MODE ?? "light");
for (const r of (process.env.ROUTES ?? "/").split(",")) {
  await page.goto(`${BASE}${r}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.setViewportSize({ width: size.width, height: Math.min(Math.max(h, 844), 5600) });
  await page.waitForTimeout(220);
  await page.screenshot({ path: `${OUT}/${r === "/" ? "home" : r.slice(1)}.png` });
  await page.setViewportSize(size);
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  if (over) console.log("OVERFLOW", r, over);
}
await browser.close();
console.log("shot");
