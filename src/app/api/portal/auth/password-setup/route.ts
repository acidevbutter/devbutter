import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/portal/config";
import { setPortalSessionCookies } from "@/lib/portal/session";

export async function POST(request: Request) {
  let token: unknown;
  let password: unknown;
  try {
    ({ token, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof token !== "string" || typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }

  const setupRes = await fetch(`${API_BASE_URL}/accounts/password-setup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password }),
    cache: "no-store",
  });

  if (!setupRes.ok) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: setupRes.status });
  }

  const tokens = (await setupRes.json()) as { access_token: string; refresh_token: string };
  await setPortalSessionCookies(tokens);

  return NextResponse.json({ ok: true });
}
