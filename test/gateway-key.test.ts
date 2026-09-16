import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * The secret is named for the gateway it is used against, not for the wire
 * format. This app speaks the Messages API, but every call goes to
 * ANTHROPIC_BASE_URL — OpenRouter — and is billed on an OpenRouter balance.
 *
 * The old name read as "an Anthropic account is required", which is not true.
 * It is still accepted so a deployment carrying the old secret keeps working,
 * and on demo day a secret set under either name has to work: the difference
 * between a scan and a 503 must never be which name someone typed.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the gateway key", () => {
  const worker = read("worker/index.ts");

  it("prefers OPENROUTER_API_KEY and falls back to the old name", () => {
    expect(worker).toMatch(/env\.OPENROUTER_API_KEY \|\| env\.ANTHROPIC_API_KEY/);
  });

  it("reports presence through the same accessor that the scan uses", () => {
    // Two reads that could disagree would make /api/health lie: green on the
    // phone, 503 on the scan. One accessor, used in both places.
    expect(worker.match(/gatewayKey\(c\.env\)/g)).toHaveLength(2);
    expect(worker).toMatch(/key_present: Boolean\(gatewayKey\(c\.env\)\)/);
    expect(worker).toMatch(/const apiKey = gatewayKey\(c\.env\);/);
    // Nothing may reach past the accessor to a single name.
    expect(worker).not.toMatch(/c\.env\.(OPENROUTER|ANTHROPIC)_API_KEY/);
  });

  it("never returns or logs the key itself", () => {
    expect(worker).not.toMatch(/console\.\w+\([^)]*apiKey/);
    expect(worker).not.toMatch(/key:\s*apiKey/);
  });

  it("tells whoever sets it the new name", () => {
    // These four are what a person reads before opening the dashboard.
    for (const doc of ["DEMO-RUNBOOK.md", "DEPLOY.md", "CLAUDE.md", "BUILD.md"]) {
      expect(read(doc), `${doc} still names the old secret`).toContain("OPENROUTER_API_KEY");
    }
  });
});
