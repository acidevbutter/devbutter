import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const MAINTENANCE_PATH = "/manutencao";

/**
 * With MAINTENANCE_MODE=true every page request is served the reconstruction page,
 * keeping the visitor's URL intact. Assets, the API and the maintenance route itself
 * are excluded by the matcher below so the page (and its form) still work.
 */
export function proxy(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE !== "true") {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname === MAINTENANCE_PATH) {
    return NextResponse.next();
  }

  return NextResponse.rewrite(new URL(MAINTENANCE_PATH, request.url));
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
