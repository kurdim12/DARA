import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { contact, contacts } from "../src/lib/verified";
import file from "../content/verified.json";
import ar from "../src/i18n/ar.json";
import en from "../src/i18n/en.json";

const root = new URL("..", import.meta.url).pathname;
const TEXT = /\.(ts|tsx|js|jsx|mjs|json|html|css|sql)$/;

/**
 * Everything that can end up in front of a person: the app, the Worker, the
 * content it renders, and the scripts that stage demos from it.
 *
 * Deliberately not docs/ or test/. Those are prose ABOUT the rule — this file
 * names the barred number three times, and so does the evidence note — and a
 * sweep that cannot tell an explanation from a fixture ends up being loosened
 * until it catches nothing.
 */
const SURFACES = ["src", "worker", "shared", "content", "public", "scripts", "index.html"];

function walk(path: string, out: string[] = []): string[] {
  if (statSync(path).isDirectory()) {
    for (const name of readdirSync(path)) walk(join(path, name), out);
  } else if (TEXT.test(path)) out.push(path);
  return out;
}

const surfaces = () => SURFACES.flatMap((name) => walk(join(root, name)));

const NEVER = (file._meta as { never_show: { value: string; why: string }[] }).never_show;

/**
 * An emergency app that prints the wrong number is worse than one that prints
 * none, and an app that prints nothing where a number should be is a shrug.
 * Both were true here: Zaid's 16 Sep pass found dead numbers on the Shield
 * screen and «بانتظار التحقق» where the rest should have been.
 *
 * These are the rules the Shield and Recover screens now depend on.
 */
describe("what the record has to carry", () => {
  it("gives every verified line a value, a source and a date", () => {
    // The brief's rule, and the reason the file is re-checkable at all: a
    // flipped flag with no provenance is just somebody's memory.
    for (const row of file.contacts.filter((c) => c.verified)) {
      const r = row as { id: string; value?: unknown; source_url?: string; verified_on?: string };
      expect(r, `${r.id} has no value field`).toHaveProperty("value");
      expect(r.source_url, `${r.id} has no source_url`).toMatch(/^https:\/\//);
      // Latin digits, ISO order — the format the screen prints inside a <bdi>.
      expect(r.verified_on, `${r.id} has no verified_on`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("says in each entry's own language when to call it", () => {
    for (const row of file.contacts) {
      const when = (row as { when_to_call?: { ar: string; en: string } }).when_to_call;
      expect(when?.ar.trim(), `${row.id} has no Arabic "when to call"`).toBeTruthy();
      expect(when?.en.trim(), `${row.id} has no English "when to call"`).toBeTruthy();
    }
  });

  it("holds extensions apart from the number they belong to", () => {
    // 196 then 812594. Glued together that is 196812594, which nobody answers —
    // so the shape has to survive the trip from JSON to the screen.
    const unit = file.contacts.find((c) => c.id === "cybercrime_unit")!;
    expect(unit.number).not.toMatch(/\d{6,}/);
    expect((unit as { extensions?: string[] }).extensions ?? []).not.toHaveLength(0);
  });
});

describe("the numbers that must never appear", () => {
  it("records why each one is barred, so nobody re-adds it in good faith", () => {
    expect(NEVER.length).toBeGreaterThan(0);
    for (const row of NEVER) expect(row.why.trim().length, row.value).toBeGreaterThan(20);
  });

  it("never reaches a screen through the accessor", () => {
    const barred = new Set(NEVER.map((row) => row.value.replace(/[^\d+]/g, "")));
    for (const lang of ["ar", "en"] as const) {
      for (const row of contacts(lang)) {
        const shown = [row.number, ...row.extensions].filter((v) => v !== null) as string[];
        for (const value of shown) {
          expect(barred.has(value.replace(/[^\d+]/g, "")), `${row.id} shows ${value}`).toBe(false);
        }
      }
    }
  });

  it("appears nowhere the app can reach but the list that bars it", () => {
    // 20224 circulates as a Cybercrime Unit number and is not one. It is
    // distinctive enough to sweep every shipping file for, which is the point:
    // catching it in a fixture or a stray string before it reaches a screen.
    const bar = join(root, "content/verified.json");
    const hits = surfaces()
      .filter((path) => path !== bar)
      .filter((path) => readFileSync(path, "utf8").includes("20224"));
    expect(hits.map((p) => p.replace(root, ""))).toEqual([]);
  });

  it("appears in the content file only inside the list that bars it", () => {
    const doc = JSON.parse(readFileSync(join(root, "content/verified.json"), "utf8"));
    const meta = JSON.stringify(doc._meta);
    delete doc._meta;
    const rest = JSON.stringify(doc);
    for (const row of NEVER) {
      expect(meta, `${row.value} is not in the bar list`).toContain(row.value);
      expect(rest, `${row.value} is live in the content file`).not.toContain(row.value);
    }
  });
});

describe("nothing on these screens is pending any more", () => {
  it("has no pending-verification wording left in either dictionary", () => {
    const gone = [
      "shield.pending_emergency",
      "shield.pending_number",
      "shield.verify_tag",
      "sh.numbers_pending",
    ];
    for (const key of gone) {
      expect(key in ar, `ar still carries ${key}`).toBe(false);
      expect(key in en, `en still carries ${key}`).toBe(false);
    }
    // And not under some other key either: the phrase itself is what a judge
    // reads, whatever it is called in the file.
    for (const [key, value] of Object.entries(ar)) {
      expect(value, `${key} still says it`).not.toContain("بانتظار التحقق");
    }
  });

  it("dials a real emergency number in both languages", () => {
    // The Shield screen's red button renders only when this is non-null.
    for (const lang of ["ar", "en"] as const) {
      expect(contact("emergency", lang)?.number, lang).toBe("911");
    }
  });

  it("answers a line that has no number with a reason and somewhere to go", () => {
    // Family Protection publishes one number per governorate. There is no
    // single national number to show, so the screen says that and routes to
    // the emergency line rather than quietly showing nothing.
    for (const lang of ["ar", "en"] as const) {
      const all = contacts(lang);
      for (const row of all.filter((r) => r.number === null)) {
        expect(row.noSingleNumber, `${row.id} is simply missing a number`).toBe(true);
        expect(row.whyNoNumber?.trim(), `${row.id} does not say why`).toBeTruthy();
        expect(row.officialUrl, `${row.id} sends nobody anywhere`).toMatch(/^https:\/\//);
        const target = all.find((r) => r.id === row.routeTo);
        expect(target?.number, `${row.id} routes nowhere callable`).toBeTruthy();
      }
    }
  });

  it("hides every number on a row nobody has verified", () => {
    for (const lang of ["ar", "en"] as const) {
      for (const row of contacts(lang)) {
        const raw = file.contacts.find((c) => c.id === row.id)!;
        if (!raw.verified) {
          expect(row.number, `${row.id} leaked a number`).toBeNull();
          expect(row.extensions, `${row.id} leaked an extension`).toEqual([]);
        }
      }
    }
  });
});

describe("the cybercrime unit has one name", () => {
  it("is not attributed to the Ministry of Interior", () => {
    // It sits under the Criminal Investigation Department of the Public
    // Security Directorate. The old copy named the wrong ministry on the
    // Report screen while the Shield screen named nothing at all.
    expect(ar["authority.cybercrime_unit"]).not.toContain("وزارة الداخلية");
    expect(en["authority.cybercrime_unit"]).not.toMatch(/ministry of interior/i);
  });

  it("names the same directorate on the report screen and in the record", () => {
    const unit = file.contacts.find((c) => c.id === "cybercrime_unit")!;
    const affiliation = (unit as { affiliation: { ar: string; en: string } }).affiliation;
    expect(affiliation.ar).toContain("مديرية الأمن العام");
    expect(ar["authority.cybercrime_unit"]).toContain("مديرية الأمن العام");
    expect(affiliation.en).toContain("Public Security Directorate");
    expect(en["authority.cybercrime_unit"]).toContain("Public Security Directorate");
  });
});

describe("what the screen dials", () => {
  it("strips a number down to digits before putting it in a tel: link", () => {
    // tel:196 812594 is not a link. The helper both screens share is the only
    // place this happens, so this is the one place it can go wrong.
    const source = readFileSync(join(root, "src/components/HelpLines.tsx"), "utf8");
    expect(source).toContain('const dial = (number: string) => `tel:${number.replace(/[^\\d+]/g, "")}`');
  });

  it("never builds a tel: link out of a number and its extension", () => {
    for (const lang of ["ar", "en"] as const) {
      for (const row of contacts(lang)) {
        if (!row.number) continue;
        expect(row.number.replace(/\D/g, "").length, `${row.id} looks glued`).toBeLessThan(6);
      }
    }
  });
});
