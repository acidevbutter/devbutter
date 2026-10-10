import { describe, expect, it } from "vitest";
import { CASES, HOME_CASES, SECTORS, filterCases, getCase, parseSectorFilter, sectorLabel } from "./cases";

describe("content/cases", () => {
  it("has unique, URL-safe ids", () => {
    const ids = CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("only uses known sectors and fills every story field", () => {
    const known = new Set(SECTORS.map((s) => s.slug));
    for (const c of CASES) {
      expect(known.has(c.sector)).toBe(true);
      for (const field of ["title", "headline", "before", "after", "problem", "built", "result", "duration"] as const) {
        expect(c[field].trim()).not.toBe("");
      }
      expect(c.tags.length).toBeGreaterThan(0);
    }
  });

  it("mirrors the prototype: 5 cases, the home rail shows the first 4", () => {
    expect(CASES).toHaveLength(5);
    expect(HOME_CASES.map((c) => c.id)).toEqual(CASES.slice(0, 4).map((c) => c.id));
  });

  it("filters by sector, 'todos' keeps everything", () => {
    expect(filterCases("todos")).toHaveLength(CASES.length);
    expect(filterCases("saude").map((c) => c.id)).toEqual(["clinica-vale"]);
    for (const s of SECTORS) {
      expect(filterCases(s.slug).every((c) => c.sector === s.slug)).toBe(true);
    }
  });

  it("parses ?setor= tolerantly", () => {
    expect(parseSectorFilter("logistica")).toBe("logistica");
    expect(parseSectorFilter(["educacao", "varejo"])).toBe("educacao");
    expect(parseSectorFilter("saúde")).toBe("todos");
    expect(parseSectorFilter("nada")).toBe("todos");
    expect(parseSectorFilter(null)).toBe("todos");
    expect(parseSectorFilter(undefined)).toBe("todos");
  });

  it("looks cases and labels up", () => {
    expect(getCase("oficina-sul")?.title).toBe("Oficina Sul");
    expect(getCase("nao-existe")).toBeUndefined();
    expect(sectorLabel("saude")).toBe("saúde");
  });
});
