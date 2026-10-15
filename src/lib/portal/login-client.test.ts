import { describe, expect, it } from "vitest";
import { isValidEmail, resolveLoginDestination, withLoginParams } from "./login-client";

const params = (query: string) => new URLSearchParams(query);

describe("resolveLoginDestination", () => {
  it("defaults to the portal and the admin dashboard", () => {
    expect(resolveLoginDestination(params(""))).toEqual({
      destination: "/portal",
      adminDestination: "/admin/dashboard",
    });
  });

  it("honours a same-origin next", () => {
    expect(resolveLoginDestination(params("next=/portal/faturas"))).toEqual({
      destination: "/portal/faturas",
      adminDestination: "/admin/dashboard",
    });
  });

  it("ignores a protocol-relative next (open redirect)", () => {
    expect(resolveLoginDestination(params("next=//evil.example/x"))).toEqual({
      destination: "/portal",
      adminDestination: "/admin/dashboard",
    });
  });

  it("ignores an absolute-URL next", () => {
    expect(resolveLoginDestination(params("next=https://evil.example")).destination).toBe("/portal");
  });

  it("sends intent=quote to a new quote", () => {
    expect(resolveLoginDestination(params("intent=quote")).destination).toBe("/portal/orcamentos?new=1");
  });

  it("routes an /admin next to admins only; customers fall back to the portal", () => {
    expect(resolveLoginDestination(params("next=/admin/quotes"))).toEqual({
      destination: "/portal",
      adminDestination: "/admin/quotes",
    });
  });
});

describe("withLoginParams", () => {
  it("carries next and intent only", () => {
    expect(withLoginParams("/criar-conta", params("next=/portal/faturas&intent=quote&origem=chat"))).toBe(
      "/criar-conta?next=%2Fportal%2Ffaturas&intent=quote",
    );
  });

  it("returns the bare path when there is nothing to carry", () => {
    expect(withLoginParams("/entrar", params(""))).toBe("/entrar");
  });
});

describe("isValidEmail", () => {
  it.each(["ana@empresa.com.br", "a.b+c@x.io"])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each(["", "ana", "ana@empresa", "ana @empresa.com", "@empresa.com"])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
