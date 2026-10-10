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

/**
 * Single login screen: the guard bounces unauthenticated admin traffic to
 * /portal/login, tagging the requested path so it can return here after login.
 */
function adminLoginUrl(request: NextRequest) {
  const url = new URL("/portal/login", request.url);
  url.searchParams.set("next", request.nextUrl.pathname);
  return url;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (process.env.MAINTENANCE_MODE === "true") {
    if (pathname !== "/manutencao" && !pathname.startsWith("/manutencao/")) {
      return NextResponse.rewrite(new URL("/manutencao", request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith("/portal")) {
    if (PUBLIC_PORTAL_PATH.test(pathname)) return NextResponse.next();
    return portalProxy(request);
  }

  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get(ADMIN_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(ADMIN_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.redirect(adminLoginUrl(request));
  }

  if (accessToken && !isJwtExpiringSoon(accessToken)) {
    return NextResponse.next();
  }

  const refreshed = await refreshTokenPair(refreshToken);
  if (!refreshed) {
    const redirectRes = NextResponse.redirect(adminLoginUrl(request));
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

const RECEBIMENTOS_PATH = "/portal/recebimentos";
const PUBLIC_PORTAL_PATH = /^\/portal\/(login|signup|sessao-expirada|acesso-negado|senha|recuperar-senha)(\/|$)/;

// Paths that stay reachable even while the onboarding gate is active. The
// matcher already keeps login/signup/sessao-expirada/acesso-negado out; this
// is the defensive list for anything the matcher still lets through.
function isGateExemptPortalPath(pathname: string): boolean {
  if (pathname === RECEBIMENTOS_PATH || pathname.startsWith(`${RECEBIMENTOS_PATH}/`)) return true;
  return PUBLIC_PORTAL_PATH.test(pathname);
}

// The onboarding gate (portal-recebimentos-onboarding.md §2): while
// `onboarding_required` is true the whole dashboard is forced to
// /portal/recebimentos. Fails open — a failed /accounts/me never blocks the
// user, and the screen itself re-checks on load.
async function portalOnboardingRequired(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${PORTAL_API_BASE_URL}/accounts/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { onboarding_required?: boolean };
    return data.onboarding_required === true;
  } catch {
    return false;
  }
}

async function portalProxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(PORTAL_ACCESS_COOKIE)?.value;
  const refreshToken = request.cookies.get(PORTAL_REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    return NextResponse.redirect(new URL("/portal/login", request.url));
  }

  let token = accessToken;
  let refreshedPair: { access_token: string; refresh_token: string } | null = null;

  if (!accessToken || isJwtExpiringSoon(accessToken)) {
    const refreshed = await refreshPortalTokenPair(refreshToken);
    if (!refreshed) {
      const redirectRes = NextResponse.redirect(new URL("/portal/login", request.url));
      redirectRes.cookies.delete(PORTAL_ACCESS_COOKIE);
      redirectRes.cookies.delete(PORTAL_REFRESH_COOKIE);
      return redirectRes;
    }
    token = refreshed.access_token;
    refreshedPair = refreshed;
  }

  const withRefreshedCookies = (res: NextResponse) => {
    if (refreshedPair) {
      res.cookies.set(PORTAL_ACCESS_COOKIE, refreshedPair.access_token, {
        ...COOKIE_BASE,
        maxAge: PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS,
      });
      res.cookies.set(PORTAL_REFRESH_COOKIE, refreshedPair.refresh_token, {
        ...COOKIE_BASE,
        maxAge: PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS,
      });
    }
    return res;
  };

  if (token && !isGateExemptPortalPath(pathname) && (await portalOnboardingRequired(token))) {
    return withRefreshedCookies(NextResponse.redirect(new URL(RECEBIMENTOS_PATH, request.url)));
  }

  return withRefreshedCookies(NextResponse.next());
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
  matcher: ["/((?!api/|_next/|.*\\.).*)"],
};
