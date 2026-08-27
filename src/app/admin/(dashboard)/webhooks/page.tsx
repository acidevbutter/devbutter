import { listWebhookEvents } from "@/lib/admin/services/webhooks";
import WebhooksClient from "./WebhooksClient";

export default async function AdminWebhooksPage() {
  const events = await listWebhookEvents();
  return <WebhooksClient events={events} />;
}
