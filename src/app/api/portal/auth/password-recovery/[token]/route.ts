import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/portal/config";

/** Checks a recovery link before `/redefinir-senha` shows the form. */
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  let checkRes: Response;
  try {
    checkRes = await fetch(
      `${API_BASE_URL}/accounts/password-recovery/${encodeURIComponent(token)}`,
      { cache: "no-store" },
    );
  } catch {
    return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
  }

  if (checkRes.ok) {
    return NextResponse.json({ valid: true });
  }
  if (checkRes.status === 404) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: 404 });
  }
  return NextResponse.json({ error: "upstream_failed" }, { status: 502 });
}
