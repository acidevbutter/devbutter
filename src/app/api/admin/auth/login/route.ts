import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_ACCESS_COOKIE,
  ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS,
  API_BASE_URL,
  ADMIN_REFRESH_COOKIE,
  ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/admin/config";
import type { AccountRead } from "@/lib/admin/types";

/**
 * BFF login: authenticates against devbutter_backend, then confirms
 * is_admin before ever setting a cookie — a valid non-admin account must
 * not get an admin session just because it can log in.
 */
export async function POST(request: Request) {
  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }

  const loginRes = await fetch(`${API_BASE_URL}/accounts/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
  });

  if (!loginRes.ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const tokens = (await loginRes.json()) as { access_token: string; refresh_token: string };

  const meRes = await fetch(`${API_BASE_URL}/accounts/me`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
    cache: "no-store",
  });

  if (!meRes.ok) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const account = (await meRes.json()) as AccountRead;
  if (!account.is_admin) {
    return NextResponse.json({ error: "not_admin" }, { status: 403 });
  }

  const cookieStore = await cookies();
  const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  cookieStore.set(ADMIN_ACCESS_COOKIE, tokens.access_token, {
    ...cookieBase,
    maxAge: ADMIN_ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  cookieStore.set(ADMIN_REFRESH_COOKIE, tokens.refresh_token, {
    ...cookieBase,
    maxAge: ADMIN_REFRESH_TOKEN_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
