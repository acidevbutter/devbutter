import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/portal/config";

/**
 * "Esqueci a senha". The backend answers 202 whether or not the e-mail has
 * an account (anti-enumeration), so the only outcomes the UI tells apart are
 * sent / bad e-mail / try again.
 */
export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof email !== "string" || !email.trim()) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  let recoveryRes: Response;
  try {
    recoveryRes = await fetch(`${API_BASE_URL}/accounts/password-recovery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  if (recoveryRes.ok) {
    return NextResponse.json({ ok: true });
  }
  if (recoveryRes.status === 422) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }
  return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
}
