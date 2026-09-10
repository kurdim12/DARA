import { defineConfig } from "vitest/config";

// Its own config on purpose: these are pure-function tests and must not boot
// the Workers runtime that the app's vite.config.ts sets up.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
