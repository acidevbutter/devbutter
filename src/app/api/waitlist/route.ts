import { NextResponse } from "next/server";
import { EMAIL_RE, forwardToFormWebhook } from "@/lib/forms/webhook";

/**
 * Collects the "avise-me no lançamento" addresses from the maintenance page. There is no
 * store in this project yet, so the address is forwarded to WAITLIST_WEBHOOK_URL (a form
 * backend, an automation, whatever the studio points it at). Without that variable set
 * the endpoint reports itself unavailable and the page falls back to the contact e-mail.
 */
export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = await request.json());
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const result = await forwardToFormWebhook({ email: email.trim(), source: "manutencao" });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
