import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/portal/config";
import { setPortalSessionCookies } from "@/lib/portal/session";

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

  const payload = {
    name: name.trim(),
    email: email.trim(),
    password,
  };
  let signupRes: Response;
  try {
    signupRes = await fetch(`${API_BASE_URL}/accounts/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  if (!signupRes.ok) {
    const body = await signupRes.json().catch(() => null);
    // FastAPI's 422 `detail` is a list of objects — only a plain string is a
    // message the page can show; anything else becomes a stable code (#64).
    const detail = typeof body?.detail === "string" ? body.detail : null;
    const error = signupRes.status === 409 ? "email_exists" : detail ?? "invalid_signup";
    const status = signupRes.status >= 500 ? 502 : signupRes.status;
    return NextResponse.json({ error }, { status });
  }

  const tokens = (await signupRes.json()) as { access_token: string; refresh_token: string };
  await setPortalSessionCookies(tokens);

  return NextResponse.json({ ok: true });
}
