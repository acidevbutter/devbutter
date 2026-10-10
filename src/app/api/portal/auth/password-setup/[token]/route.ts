import { NextResponse } from "next/server";
import { API_BASE_URL } from "@/lib/portal/config";

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const checkRes = await fetch(`${API_BASE_URL}/accounts/password-setup/${encodeURIComponent(token)}`, {
    cache: "no-store",
  });

  if (!checkRes.ok) {
    return NextResponse.json({ error: "invalid_or_expired" }, { status: checkRes.status });
  }

  const body = (await checkRes.json()) as { email: string };
  return NextResponse.json(body);
}
