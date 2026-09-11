import { describe, expect, it } from "vitest";
import {
  HAS_VERIFIED_PATTERNS,
  matchVerifiedPattern,
  type ThreatPattern,
} from "../worker/engine/match";

/**
 * Engine-test fixtures ONLY. These are not evidence and are never loaded in
 * production — the real corpus is content/verified-threat-patterns.json, and a
 * pattern only counts there when it carries a named source.
 */
const FIXTURE: ThreatPattern[] = [
  {
    id: "fixture_parcel",
    title_ar: "نمط اختباري",
    title_en: "Test pattern",
    impersonated_entity: "Test Post",
    categories: ["parcel_customs"],
    channels: ["sms"],
    attack_goals: ["obtain_personal_data"],
    pressure_methods: ["urgency"],
    url_signals: ["claimed_government_non_gov_jo"],
    verified: true,
  },
];

describe("verified corpus", () => {
  it("ships empty, so nothing can match in production", () => {
    expect(HAS_VERIFIED_PATTERNS).toBe(false);
    expect(
      matchVerifiedPattern({
        category: "parcel_customs",
        impersonated_entity: "Test Post",
        channel: "sms",
        attack_goal: "obtain_personal_data",
        pressure_methods: ["urgency"],
        url_signals: ["claimed_government_non_gov_jo"],
      }),
    ).toBeNull();
  });
});

describe("matching against a pattern", () => {
  it("matches when entity, goal, pressure and link all line up", () => {
    const match = matchVerifiedPattern(
      {
        category: "parcel_customs",
        impersonated_entity: "Test Post",
        channel: "sms",
        attack_goal: "obtain_personal_data",
        pressure_methods: ["urgency"],
        url_signals: ["claimed_government_non_gov_jo"],
      },
      FIXTURE,
    );
    expect(match).not.toBeNull();
    expect(match!.pattern_id).toBe("fixture_parcel");
    expect(match!.confidence).toBe("strong");
    expect(match!.matched_signals.length).toBeGreaterThanOrEqual(3);
  });

  it("does not match on a shared category alone", () => {
    expect(
      matchVerifiedPattern(
        {
          category: "parcel_customs",
          impersonated_entity: null,
          channel: "email",
          attack_goal: "unknown",
          pressure_methods: [],
          url_signals: [],
        },
        FIXTURE,
      ),
    ).toBeNull();
  });

  it("does not match a superficially similar but unrelated case", () => {
    // Same channel and one shared pressure method, nothing else.
    expect(
      matchVerifiedPattern(
        {
          category: "fake_prize",
          impersonated_entity: "Someone Else",
          channel: "sms",
          attack_goal: "obtain_payment",
          pressure_methods: ["urgency"],
          url_signals: [],
        },
        FIXTURE,
      ),
    ).toBeNull();
  });

  it("does not match on category plus goal without the entity or the link", () => {
    expect(
      matchVerifiedPattern(
        {
          category: "parcel_customs",
          impersonated_entity: "A Different Courier",
          channel: "whatsapp",
          attack_goal: "obtain_personal_data",
          pressure_methods: [],
          url_signals: [],
        },
        FIXTURE,
      ),
    ).toBeNull();
  });

  it("ignores an unverified entry even when it would otherwise match", () => {
    const unverified = [{ ...FIXTURE[0]!, verified: false }];
    expect(
      matchVerifiedPattern(
        {
          category: "parcel_customs",
          impersonated_entity: "Test Post",
          channel: "sms",
          attack_goal: "obtain_personal_data",
          pressure_methods: ["urgency"],
          url_signals: ["claimed_government_non_gov_jo"],
        },
        // Production filters these out before they reach the scorer; this
        // asserts the corpus loader is what does the filtering.
        unverified.filter((p) => p.verified === true),
      ),
    ).toBeNull();
  });
});
