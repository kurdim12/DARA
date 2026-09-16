import { describe, expect, it } from "vitest";
import { hostsIn, numbersIn, tally, padWeeks } from "../worker/routes/radar";
import { normaliseDomain, operatorOf } from "../worker/routes/lookup";

describe("hostsIn", () => {
  it("reads a host out of a link and out of a bare domain", () => {
    expect(hostsIn("pay here http://ticket-ammancityi.top/fine now")).toEqual([
      "ticket-ammancityi.top",
    ]);
    expect(hostsIn("go to amanat-pay-now.com/fine")).toEqual(["amanat-pay-now.com"]);
  });

  it("drops www. and trailing punctuation so one host counts once", () => {
    expect(hostsIn("see www.Example.com, and example.com.")).toEqual([
      "example.com",
      "example.com",
    ]);
  });

  it("finds nothing in text that has no host", () => {
    expect(hostsIn("اتصل بنا اليوم")).toEqual([]);
  });
});

describe("numbersIn", () => {
  it("normalises spacing so one number counts once", () => {
    expect(numbersIn("call 079 123 4567 or 0791234567")).toEqual(["0791234567", "0791234567"]);
  });

  it("ignores a short figure like an amount", () => {
    expect(numbersIn("ادفع 45 دينار")).toEqual([]);
  });
});

describe("tally", () => {
  it("counts, orders by count then name, and caps the list", () => {
    expect(tally(["b", "a", "b", "c", "a", "b"], 2)).toEqual([
      { key: "b", count: 3 },
      { key: "a", count: 2 },
    ]);
  });

  it("returns nothing for nothing, which is what the empty state renders", () => {
    expect(tally([])).toEqual([]);
  });
});

describe("normaliseDomain", () => {
  it("takes a host out of a URL and lowercases it", () => {
    expect(normaliseDomain("HTTPS://WWW.Amman.JO/path?x=1")).toBe("amman.jo");
  });

  it("refuses things that are not domains", () => {
    expect(normaliseDomain("0791234567")).toBeNull();
    expect(normaliseDomain("ahmad")).toBeNull();
  });
});

describe("operatorOf", () => {
  it("names a landline, which is structural and not an allocation claim", () => {
    expect(operatorOf("065551234")).toBe("landline");
  });

  it("accepts a Jordanian mobile in any of its three written forms", () => {
    for (const form of ["0791234567", "962791234567", "00962791234567"]) {
      expect(operatorOf(form)).toBe("unknown");
    }
  });

  it("says unknown for a mobile network while the prefix map is unverified", () => {
    // content/lookup-facts.json ships verified:false, so the screen says
    // "could not be checked" instead of naming a network nobody sourced.
    expect(operatorOf("0791234567")).toBe("unknown");
  });

  it("calls a non-Jordanian number foreign", () => {
    expect(operatorOf("447700900123")).toBe("foreign");
  });
});

describe("padWeeks", () => {
  const NOW = new Date("2026-09-16T12:00:00Z"); // a Wednesday

  it("returns eight weeks, oldest first, ending with this one", () => {
    const out = padWeeks([], NOW);
    expect(out).toHaveLength(8);
    expect(out[7].week_start).toBe("2026-09-14"); // the Monday of NOW's week
    expect(out[0].week_start).toBe("2026-07-27");
    expect(out.map((w) => w.count)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it("keeps the counts it was given and zeroes the rest", () => {
    const out = padWeeks(
      [
        { week_start: "2026-09-07", count: 4 },
        { week_start: "2026-09-14", count: 4 },
      ],
      NOW,
    );
    expect(out.map((w) => w.count)).toEqual([0, 0, 0, 0, 0, 0, 4, 4]);
  });

  it("drops a week older than the window rather than distorting it", () => {
    const out = padWeeks([{ week_start: "2026-01-05", count: 99 }], NOW);
    expect(out).toHaveLength(8);
    expect(out.every((w) => w.count === 0)).toBe(true);
  });

  it("is stable when NOW is itself a Monday", () => {
    const out = padWeeks([{ week_start: "2026-09-14", count: 2 }], new Date("2026-09-14T00:00:00Z"));
    expect(out[7]).toEqual({ week_start: "2026-09-14", count: 2 });
  });

  it("is stable when NOW is a Sunday, which belongs to the week that started Monday", () => {
    const out = padWeeks([{ week_start: "2026-09-14", count: 2 }], new Date("2026-09-20T23:59:00Z"));
    expect(out[7]).toEqual({ week_start: "2026-09-14", count: 2 });
  });
});
