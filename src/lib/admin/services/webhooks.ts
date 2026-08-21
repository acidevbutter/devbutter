import "server-only";
import { mockWebhookEvents } from "../mock/data";
import type { AdminWebhookEvent } from "../types";

// MOCK: contract in docs/admin-api-contracts.md#webhook-event-log — inbound
// Asaas webhooks are processed inline (app/webhooks/router.py) but nothing
// persists an event log for admin to inspect/replay.
export async function listWebhookEvents(): Promise<AdminWebhookEvent[]> {
  return mockWebhookEvents;
}

export async function reprocessWebhookEvent(id: string): Promise<AdminWebhookEvent> {
  const event = mockWebhookEvents.find((e) => e.id === id);
  if (!event) throw new Error("Webhook event not found");
  // Stand-in only — a real reprocess would re-run POST /webhooks/asaas
  // against the stored payload (see the contract doc).
  event.processed_ok = true;
  event.error_message = null;
  return event;
}
