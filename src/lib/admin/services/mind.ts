import { AdminApiError, adminFetch } from "../api";
import type {
  AdminMindDashboard,
  AdminMindGovernance,
  AdminMindTurnMetric,
} from "../types";

export async function getMindDashboardData(): Promise<{
  overview: AdminMindDashboard;
  governance: AdminMindGovernance;
}> {
  const [overview, governance] = await Promise.all([
    adminFetch<AdminMindDashboard>("/admin/mind/overview"),
    adminFetch<AdminMindGovernance>("/admin/mind/settings"),
  ]);
  return { overview, governance };
}

export async function getMindTurnMetrics(
  conversationId: string
): Promise<AdminMindTurnMetric[] | null> {
  try {
    return await adminFetch<AdminMindTurnMetric[]>(
      `/admin/mind/conversations/${conversationId}/turn-metrics`
    );
  } catch (err) {
    if (err instanceof AdminApiError && err.status >= 500) return null;
    throw err;
  }
}

export async function updateMindGovernance(
  input: Omit<AdminMindGovernance, "uses_runtime_override" | "maritaca_model" | "embeddings_model_name">
): Promise<AdminMindGovernance> {
  return adminFetch<AdminMindGovernance>("/admin/mind/settings", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}
