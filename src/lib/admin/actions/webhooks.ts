"use server";

import { revalidatePath } from "next/cache";
import * as webhooksService from "../services/webhooks";
import type { AdminWebhookEventDetail } from "../types";

export async function reprocessWebhookEventAction(eventId: string): Promise<void> {
  await webhooksService.reprocessWebhookEvent(eventId);
  revalidatePath("/admin/webhooks");
}

export async function getWebhookEventDetailAction(
  eventId: string
): Promise<AdminWebhookEventDetail> {
  return webhooksService.getWebhookEvent(eventId);
}
