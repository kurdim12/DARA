import { execSync } from "node:child_process";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { VitePWA } from "vite-plugin-pwa";

// The install prompt and the splash screen. Paper is the page the app opens
// onto; red belongs to the icon, not the chrome. Keep both in step with
// src/styles/tokens.css.
const PAPER = "#FBF8F8";

/**
 * The commit this bundle was built from, so anyone holding a phone can answer
 * "am I looking at the latest one?" without asking. Shown in the staged-message
 * tray behind a long press on the logo. Falls back to "dev" when git is not
 * there — never fails the build over a label.
 */
function buildId(): string {
  for (const key of ["WORKERS_CI_COMMIT_SHA", "CF_PAGES_COMMIT_SHA", "GITHUB_SHA"]) {
    const value = process.env[key];
    if (value) return value.slice(0, 7);
  }
  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "dev";
  }
}

export default defineConfig({
  define: {
    __BUILD_ID__: JSON.stringify(buildId()),
  },
  plugins: [
    react(),
    tailwindcss(),
    cloudflare(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["brand/dara-mark.png"],
      manifest: {
        // The app opens in English and the wordmark reads DARA', so the home
        // screen should too. It was still Arabic-first here from the build
        // before the rebuild.
        name: "درع DARA'",
        short_name: "درع",
        description: "Check any message, link or number before you act.",
        lang: "en",
        dir: "ltr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: PAPER,
        background_color: PAPER,
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // App shell + fonts are precached. /api/* is never cached: a stale
        // verdict must never be served as a live one.
        globPatterns: ["**/*.{js,css,html,woff2,png,svg}"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ],
});
