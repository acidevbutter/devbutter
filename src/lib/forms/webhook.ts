import "server-only";

// The one place site forms are delivered today: WAITLIST_WEBHOOK_URL (a form
// backend / automation the studio points it at — see api/waitlist). Each form
// tags its payload with `source` so the automation can route it.

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type FormWebhookResult =
  | { ok: true }
  | { ok: false; status: 503; error: "not_configured" }
  | { ok: false; status: 502; error: "upstream_failed" };

export async function forwardToFormWebhook(
  payload: Record<string, unknown> & { source: string }
): Promise<FormWebhookResult> {
  const webhook = process.env.WAITLIST_WEBHOOK_URL;
  if (!webhook) return { ok: false, status: 503, error: "not_configured" };

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return { ok: false, status: 502, error: "upstream_failed" };
  } catch {
    return { ok: false, status: 502, error: "upstream_failed" };
  }
  return { ok: true };
}
