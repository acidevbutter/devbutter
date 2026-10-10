import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/portal/config";

export async function POST(request: Request) {
  let token: unknown;
  let password: unknown;
  try {
    ({ token, password } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof token !== "string" || !token) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 410 });
  }
  if (typeof password !== "string" || password.length < 8) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }

  let completeRes: Response;
  try {
    completeRes = await fetch(`${API_BASE_URL}/accounts/password-recovery/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  // Decision: the backend answers with a TokenPair (it logs the user in), but
  // the design ends on "Senha alterada — use a senha nova pra entrar". We
  // discard the pair: no session cookies are set and tokens never reach the
  // browser, so the user proves the new password on /entrar.
  if (completeRes.ok) {
    return NextResponse.json({ ok: true });
  }
  // 404 = unknown, expired or already-used token. 410 Gone tells the UI to
  // send the user to /link-expirado.
  if (completeRes.status === 404) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 410 });
  }
  if (completeRes.status === 422) {
    return NextResponse.json({ error: "invalid_password" }, { status: 400 });
  }
  return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
}
