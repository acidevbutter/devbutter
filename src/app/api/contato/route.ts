import { NextResponse } from "next/server";
import { EMAIL_RE, forwardToFormWebhook } from "@/lib/forms/webhook";

const MAX_NAME = 120;
const MAX_MESSAGE = 4000;

/**
 * "Deixar um recado" on /contato. Goes to the same form webhook the waitlist
 * already uses (tagged `source: "contato"`) — no new destination. The fastest
 * path for a lead is still the diagnosis chat; this is the fallback.
 *
 * `website` is a honeypot: humans never see it, bots fill it. A filled honeypot
 * gets a fake success so the bot learns nothing.
 */
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { name, email, message, website } = body;
  if (typeof website === "string" && website.trim()) {
    return NextResponse.json({ ok: true });
  }

  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > MAX_NAME ||
    typeof email !== "string" ||
    !EMAIL_RE.test(email.trim()) ||
    typeof message !== "string" ||
    !message.trim() ||
    message.trim().length > MAX_MESSAGE
  ) {
    return NextResponse.json({ error: "invalid_contact" }, { status: 400 });
  }

  const result = await forwardToFormWebhook({
    name: name.trim(),
    email: email.trim(),
    message: message.trim(),
    source: "contato",
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ ok: true });
}
