import "server-only";
import { mockDashboard } from "../mock/data";
import { listReviewQueue } from "./quotes";
import type { AdminDashboardMetrics, QuoteRead } from "../types";

/**
 * The review-queue table is real (GET /admin/quotes). Everything else on the
 * Dashboard screen (1b) — stat tiles, activity feed — has no aggregate
 * endpoint yet: MOCK, contract in docs/admin-api-contracts.md#get-admindashboard.
 */
export async function getDashboardData(): Promise<{
  metrics: AdminDashboardMetrics;
  reviewQueue: QuoteRead[];
}> {
  const reviewQueue = await listReviewQueue();
  return { metrics: mockDashboard, reviewQueue };
}
