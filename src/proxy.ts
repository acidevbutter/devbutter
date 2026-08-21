import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS,
  ADMIN_API_BASE_URL,
  ADMIN_REFRESH_COOKIE,
  ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/admin/config";
import { isJwtExpiringSoon } from "@/lib/admin/token";

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export async function proxy(request: NextRequest) {
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
    const res = await fetch(`${ADMIN_API_BASE_URL}/accounts/refresh`, {
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
  matcher: ["/admin", "/admin/((?!login).*)"],
};
