import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

/**
 * الرئيسية · بلاغاتي · فحص · الرادار · تعافي.
 *
 * فحص is raised out of the bar, so it has to be the middle one. The brief
 * contradicted itself — its ordered list put فحص second while the same
 * paragraph called it "the raised centre button" — and Abdelrahman resolved
 * it in favour of the centre. A raised button sitting 78px off centre reads
 * as a bug to every person who never saw the list.
 */
const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

describe("the tab bar", () => {
  const nav = read("src/components/BottomNav.tsx");
  const order = [...nav.matchAll(/route: "(\w+)", label: "nav\.\w+"/g)].map((m) => m[1]);

  it("has five tabs in the agreed order", () => {
    expect(order).toEqual(["home", "report", "scan", "radar", "help"]);
  });

  it("puts the raised tab in the exact middle", () => {
    const raised = nav.match(/const raised = route === "(\w+)"/)?.[1];
    expect(raised).toBe("scan");
    // Middle of an odd-length row: equal counts either side, in both
    // directions, because the row is a flex row that mirrors itself.
    const at = order.indexOf(raised!);
    expect(order.length % 2).toBe(1);
    expect(at).toBe((order.length - 1) / 2);
    expect(at).toBe(order.length - 1 - at);
  });

  it("is described the same way everywhere a person reads it", () => {
    const bar = "الرئيسية · بلاغاتي · فحص · الرادار · تعافي";
    expect(nav, "BottomNav's own doc comment").toContain(bar);
    expect(read("DEMO-RUNBOOK.md"), "the runbook the presenter reads").toContain(bar);
  });
});
