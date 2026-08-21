import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal/config";
import { createPortalSessionCookieValue } from "@/lib/portal/session";

// MOCKED signup — no devbutter_backend call, no persistence beyond the
// session cookie itself. Password isn't stored anywhere; only required
// non-empty so the form behaves like a real signup.
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

  const cookieStore = await cookies();
  cookieStore.set(
    PORTAL_SESSION_COOKIE,
    await createPortalSessionCookieValue({ name: name.trim(), email: email.trim(), businessName: null }),
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    }
  );

  return NextResponse.json({ ok: true });
}
