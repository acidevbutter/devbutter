import "server-only";
import { adminFetch } from "../api";
import { listReviewQueue } from "./quotes";
import type { AdminDashboardMetrics, QuoteRead } from "../types";

/** Real: GET /admin/dashboard + GET /admin/quotes (the review queue table). */
export async function getDashboardData(): Promise<{
  metrics: AdminDashboardMetrics;
  reviewQueue: QuoteRead[];
}> {
  const [metrics, reviewQueue] = await Promise.all([
    adminFetch<AdminDashboardMetrics>("/admin/dashboard"),
    listReviewQueue(),
  ]);
  return { metrics, reviewQueue };
}
