"use server";

import { revalidatePath } from "next/cache";
import * as webhooksService from "../services/webhooks";

export async function reprocessWebhookEventAction(eventId: string): Promise<void> {
  await webhooksService.reprocessWebhookEvent(eventId);
  revalidatePath("/admin/webhooks");
}
