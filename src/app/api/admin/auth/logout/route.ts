import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_ACCESS_COOKIE, ADMIN_REFRESH_COOKIE } from "@/lib/admin/config";

// Auth is stateless JWT (app/core/security.py) — nothing to invalidate
// server-side, this just drops the cookies that hold it. Plain <form
// method="post"> target, so it redirects rather than returning JSON.
export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_ACCESS_COOKIE);
  cookieStore.delete(ADMIN_REFRESH_COOKIE);
  return NextResponse.redirect(new URL("/admin/login", request.url), { status: 303 });
}
