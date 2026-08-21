import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal/config";
import { createPortalSessionCookieValue, findMockSessionByEmail } from "@/lib/portal/session";

// MOCKED login — no devbutter_backend call. Any password is accepted for the
// one seeded demo account (ana@atelie-corvo.com); see lib/portal/mock/data.ts.
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

  const session = findMockSessionByEmail(email);
  if (!session) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(PORTAL_SESSION_COOKIE, await createPortalSessionCookieValue(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });

  return NextResponse.json({ ok: true });
}
