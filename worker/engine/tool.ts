import { CATEGORIES } from "../../shared/types";

/**
 * The one tool the engine may call. Forced tool choice means the model has to
 * answer through this schema, so the Worker never parses free prose.
 */
export const REPORT_VERDICT_TOOL = {
  name: "report_verdict",
  description: "Return the verdict for the analyzed message.",
  input_schema: {
    type: "object" as const,
    properties: {
      verdict: {
        type: "string",
        enum: ["scam", "suspicious", "likely_safe"],
      },
      confidence: { type: "integer", minimum: 0, maximum: 100 },
      category: { type: "string", enum: CATEGORIES },
      impersonated_entity: { type: ["string", "null"] },
      headline: { type: "string" },
      red_flags: {
        type: "array",
        maxItems: 4,
        items: {
          type: "object",
          properties: {
            quote: { type: "string" },
            why: { type: "string" },
          },
          required: ["quote", "why"],
        },
      },
      actions: {
        type: "array",
        minItems: 2,
        maxItems: 3,
        items: { type: "string" },
      },
      report_recommended: { type: "boolean" },
      route_to_shield: { type: "boolean" },
    },
    required: [
      "verdict",
      "confidence",
      "category",
      "impersonated_entity",
      "headline",
      "red_flags",
      "actions",
      "report_recommended",
      "route_to_shield",
    ],
  },
};

/** The tool's raw output, before post-validation. Every field is suspect here. */
export interface RawVerdict {
  verdict?: unknown;
  confidence?: unknown;
  category?: unknown;
  impersonated_entity?: unknown;
  headline?: unknown;
  red_flags?: unknown;
  actions?: unknown;
  report_recommended?: unknown;
  route_to_shield?: unknown;
}
