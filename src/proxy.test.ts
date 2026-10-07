import { describe, expect, it } from "vitest";
import { config } from "./proxy";

// Next compiles matcher strings with path-to-regexp, but the portal entry
// only uses a literal prefix plus a `(…)` group holding plain regex syntax
// (a negative lookahead), so anchoring it is an accurate stand-in here.
const portalPattern = config.matcher.find((entry) => entry.startsWith("/portal/"));
const portalMatcher = new RegExp(`^${portalPattern}$`);

describe("proxy config.matcher", () => {
  it("has a /portal/… entry", () => {
    expect(portalPattern).toBeDefined();
  });

  it.each(["/portal/senha/abc", "/portal/recuperar-senha/abc", "/portal/login", "/portal/sessao-expirada"])(
    "lets %s through without a session",
    (pathname) => {
      expect(portalMatcher.test(pathname)).toBe(false);
    },
  );

  it.each(["/portal/faturas", "/portal/orcamentos/123", "/portal/recebimentos"])(
    "still guards %s",
    (pathname) => {
      expect(portalMatcher.test(pathname)).toBe(true);
    },
  );
});
