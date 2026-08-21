import "server-only";
import { mockQuotes } from "../mock/data";
import type { PortalQuote } from "../types";

export async function listQuotes(): Promise<PortalQuote[]> {
  return [...mockQuotes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
