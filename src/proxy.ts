import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS,
  API_BASE_URL,
  ADMIN_REFRESH_COOKIE,
  ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/admin/config";
import { isJwtExpiringSoon } from "@/lib/admin/token";
import {
  API_BASE_URL as PORTAL_API_BASE_URL,
  PORTAL_ACCESS_COOKIE,
  PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS,
  PORTAL_REFRESH_COOKIE,
  PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/portal/config";

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/portal")) {
    return portalProxy(request);
  }

  const accessToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  if (accessToken && !isJwtExpiringSoon(accessToken)) {
    return NextResponse.next();
  }

  const refreshed = await refreshTokenPair(refreshToken);
  if (!refreshed) {
    const redirectRes = NextResponse.redirect(new URL("/admin/login", request.url));
    redirectRes.cookies.delete(ADMIN_ACCESS_COOKIE);
    redirectRes.cookies.delete(ADMIN_REFRESH_COOKIE);
    return redirectRes;
  }

  const response = NextResponse.next();
  response.cookies.set(ADMIN_ACCESS_COOKIE, refreshed.access_token, {
    ...COOKIE_BASE,
    maxAge: ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  response.cookies.set(ADMIN_REFRESH_COOKIE, refreshed.refresh_token, {
    ...COOKIE_BASE,
    maxAge: ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
  return response;
}

async function refreshTokenPair(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/accounts/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { access_token: string; refresh_token: string };
  } catch {
    return null;
  }
}

async function portalProxy(request: NextRequest) {
  const accessToken = request.cookies.get(PORTAL_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(PORTAL_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }

  if (accessToken && !isJwtExpiringSoon(accessToken)) return NextResponse.next();

  const refreshed = await refreshPortalTokenPair(refreshToken);
  if (!refreshed) {
    const redirectRes = NextResponse.redirect(new URL("/portal/login", request.url));
    redirectRes.cookies.delete(PORTAL_ACCESS_COOKIE);
    redirectRes.cookies.delete(PORTAL_REFRESH_COOKIE);
    return redirectRes;
  }

  const response = NextResponse.next();
  response.cookies.set(PORTAL_ACCESS_COOKIE, refreshed.access_token, {
    ...COOKIE_BASE,
    maxAge: PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  response.cookies.set(PORTAL_REFRESH_COOKIE, refreshed.refresh_token, {
    ...COOKIE_BASE,
    maxAge: PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS,
  });
  return response;
}

async function refreshPortalTokenPair(
  refreshToken: string
): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
    const res = await fetch(`${PORTAL_API_BASE_URL}/accounts/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as { access_token: string; refresh_token: string };
  } catch {
    return null;
  }
}

export const config = {
  matcher: [
    "/admin",
    "/admin/((?!login).*)",
    "/portal",
    // sessao-expirada / acesso-negado are the unauthenticated fallbacks the
    // portal redirects *to*, so they must stay reachable without a session.
    "/portal/((?!login|signup|sessao-expirada|acesso-negado).*)",
  ],
};
