import { describe, expect, it } from "vitest";
import { redactPrices } from "./redact";

describe("redactPrices", () => {
  it("strips price_range / budget_range at any depth and keeps everything else", () => {
    const input = {
      reference: "COT-0042",
      price_range: "R$ 18–24k",
      timeline: "7–9 semanas",
      draft_preview: {
        budget_range: "R$ 10k",
        timeline: "3 semanas",
        options: [
          { key: "a", title: "Integração", price_range: "R$ 8–12k", timeline: "3–4 semanas" },
          { key: "b", title: "Plataforma", price_range: null, timeline: null },
        ],
      },
      tokens: null,
    };

    expect(redactPrices(input)).toEqual({
      reference: "COT-0042",
      timeline: "7–9 semanas",
      draft_preview: {
        timeline: "3 semanas",
        options: [
          { key: "a", title: "Integração", timeline: "3–4 semanas" },
          { key: "b", title: "Plataforma", timeline: null },
        ],
      },
      tokens: null,
    });
  });

  it("passes primitives and null through", () => {
    expect(redactPrices(null)).toBeNull();
    expect(redactPrices("x")).toBe("x");
    expect(redactPrices([1, 2])).toEqual([1, 2]);
  });
});
