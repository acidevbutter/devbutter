import "server-only";
import { adminFetch } from "../api";
import type { AdminWebhookEvent } from "../types";

interface BackendWebhookEvent {
  id: string;
  event_type: string;
  related_invoice_id: string | null;
  processed_ok: boolean;
  error_message: string | null;
  payload: Record<string, unknown>;
  received_at: string;
}

interface AdminWebhookEventListPage {
  items: BackendWebhookEvent[];
  total: number;
  page: number;
  page_size: number;
  error_count: number;
}

function toFrontendEvent(event: BackendWebhookEvent): AdminWebhookEvent {
  return {
    ...event,
    related_label: event.related_invoice_id ? `invoice ${event.related_invoice_id.slice(0, 8)}` : "—",
  };
}

// Real: GET /admin/webhooks/events.
export async function listWebhookEvents(): Promise<AdminWebhookEvent[]> {
  const page = await adminFetch<AdminWebhookEventListPage>("/admin/webhooks/events?page_size=100");
  return page.items.map(toFrontendEvent);
}

// Real: POST /admin/webhooks/events/{id}/reprocess.
export async function reprocessWebhookEvent(id: string): Promise<AdminWebhookEvent> {
  const event = await adminFetch<BackendWebhookEvent>(`/admin/webhooks/events/${id}/reprocess`, {
    method: "POST",
  });
  return toFrontendEvent(event);
}
