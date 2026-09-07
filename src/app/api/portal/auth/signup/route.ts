import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/portal/config";
import { setPortalSessionCookies } from "@/lib/portal/session";

export async function POST(request: Request) {
  let name: unknown;
  let email: unknown;
  let password: unknown;
  let billing_profile: unknown;
  try {
    ({ name, email, password, billing_profile } = await request.json());
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

  // billing_profile is validated by the backend (BillingProfileInput); pass it
  // through verbatim when present so the portal PJ signup collects the Asaas
  // subaccount inputs in one call.
  const payload: Record<string, unknown> = {
    name: name.trim(),
    email: email.trim(),
    password,
  };
  if (billing_profile && typeof billing_profile === "object") {
    payload.billing_profile = billing_profile;
  }

  const signupRes = await fetch(`${API_BASE_URL}/accounts/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!signupRes.ok) {
    const body = await signupRes.json().catch(() => null);
    const error = signupRes.status === 409 ? "email_exists" : body?.detail ?? "invalid_signup";
    return NextResponse.json({ error }, { status: signupRes.status });
  }

  const tokens = (await signupRes.json()) as { access_token: string; refresh_token: string };
  await setPortalSessionCookies(tokens);

  return NextResponse.json({ ok: true });
}
