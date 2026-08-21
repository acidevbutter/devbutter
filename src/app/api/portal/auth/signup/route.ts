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
  let name: unknown;
  let email: unknown;
  let password: unknown;
  try {
    ({ name, email, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (
    typeof name !== "string" ||
    !name.trim() ||
    typeof email !== "string" ||
    !email.trim() ||
    typeof password !== "string" ||
    !password
  ) {
    return NextResponse.json({ error: "invalid_signup" }, { status: 400 });
  }

  const signupRes = await fetch(`${API_BASE_URL}/accounts/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), email: email.trim(), password }),
    cache: "no-store",
  });

  if (!signupRes.ok) {
    const body = await signupRes.json().catch(() => null);
    const error = signupRes.status === 409 ? "email_exists" : body?.detail ?? "invalid_signup";
    return NextResponse.json({ error }, { status: signupRes.status });
  }

  const tokens = (await signupRes.json()) as { access_token: string; refresh_token: string };
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
