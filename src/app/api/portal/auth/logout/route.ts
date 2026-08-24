import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PORTAL_ACCESS_COOKIE, PORTAL_COOKIE_DOMAIN, PORTAL_REFRESH_COOKIE } from "@/lib/portal/config";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  // delete() must be told the same domain/path the cookie was set with --
  // otherwise, when PORTAL_COOKIE_DOMAIN is set, it clears nothing and the
  // old cookie lingers client-side until it naturally expires.
  const deleteOpts = { path: "/", ...(PORTAL_COOKIE_DOMAIN ? { domain: PORTAL_COOKIE_DOMAIN } : {}) };
  cookieStore.delete({ name: PORTAL_ACCESS_COOKIE, ...deleteOpts });
  cookieStore.delete({ name: PORTAL_REFRESH_COOKIE, ...deleteOpts });
  return NextResponse.redirect(new URL("/portal/login", request.url), { status: 303 });
}
