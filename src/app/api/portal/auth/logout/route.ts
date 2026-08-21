import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { PORTAL_SESSION_COOKIE } from "@/lib/portal/config";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(PORTAL_SESSION_COOKIE);
  return NextResponse.redirect(new URL("/portal/login", request.url), { status: 303 });
}
