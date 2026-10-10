import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  getRewrittenUrl,
  isRewrite,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { config, proxy } from "./proxy";

afterEach(() => vi.unstubAllEnvs());

describe("proxy de manutenção", () => {
  it.each(["/", "/cases", "/portal/faturas", "/admin/dashboard"])(
    "reescreve %s para a tela de manutenção quando ativado",
    async (pathname) => {
      vi.stubEnv("MAINTENANCE_MODE", "true");
      const response = await proxy(new NextRequest(`https://devbutter.tech${pathname}`));
      expect(isRewrite(response)).toBe(true);
      expect(getRewrittenUrl(response)).toBe("https://devbutter.tech/manutencao");
    },
  );

  it("mantém a própria tela acessível", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "true");
    const response = await proxy(new NextRequest("https://devbutter.tech/manutencao"));
    expect(isRewrite(response)).toBe(false);
  });

  it("deixa home e login acessíveis quando desativado", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "false");
    for (const pathname of ["/", "/portal/login", "/admin/login"]) {
      const response = await proxy(new NextRequest(`https://devbutter.tech${pathname}`));
      expect(response.status).toBe(200);
      expect(isRewrite(response)).toBe(false);
    }
  });

  it("preserva a proteção de admin e portal quando desativado", async () => {
    vi.stubEnv("MAINTENANCE_MODE", "false");
    for (const [pathname, destination] of [
      ["/portal/faturas", "/portal/login"],
      ["/admin/dashboard", "/portal/login?next=%2Fadmin%2Fdashboard"],
    ]) {
      const response = await proxy(new NextRequest(`https://devbutter.tech${pathname}`));
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(`https://devbutter.tech${destination}`);
    }
  });
});

describe("config.matcher", () => {
  it.each(["/", "/cases", "/portal/login", "/portal/faturas", "/admin/dashboard"])(
    "executa o proxy em %s",
    (pathname) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `https://devbutter.tech${pathname}` })).toBe(true);
    },
  );

  it.each(["/api/waitlist", "/_next/static/chunk.js", "/favicon.ico", "/logo.svg"])(
    "não intercepta %s",
    (pathname) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url: `https://devbutter.tech${pathname}` })).toBe(false);
    },
  );
});
