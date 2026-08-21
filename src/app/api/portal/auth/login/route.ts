import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  API_BASE_URL,
  PORTAL_ACCESS_COOKIE,
  PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS,
  PORTAL_REFRESH_COOKIE,
  PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS,
} from "@/lib/portal/config";

export async function POST(request: Request) {
  let email: unknown;
  let password: unknown;
  try {
    ({ email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof email !== "string" || typeof password !== "string" || !password) {
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

  const cookieStore = await cookies();
  const cookieBase = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  };
  cookieStore.set(PORTAL_ACCESS_COOKIE, tokens.access_token, {
    ...cookieBase,
    maxAge: PORTAL_ACCESS_TOKEN_MAX_AGE_SECONDS,
  });
  cookieStore.set(PORTAL_REFRESH_COOKIE, tokens.refresh_token, {
    ...cookieBase,
    maxAge: PORTAL_REFRESH_TOKEN_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
