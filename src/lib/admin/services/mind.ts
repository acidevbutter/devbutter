import { AdminApiError, adminFetch } from "../api";
import type {
  AdminMindDashboard,
  AdminMindGovernance,
  AdminMindTurnMetric,
  AdminLLMBudget,
  AdminLLMUsageSummary,
} from "../types";

export const mindBudgetFlows = [
  "general_chat",
  "site_text_generation",
  "diagnosis_chat",
  "diagnosis_extraction",
] as const;

export async function getMindDashboardData(): Promise<{
  overview: AdminMindDashboard;
  governance: AdminMindGovernance;
  usage: AdminLLMUsageSummary;
  budgets: Array<AdminLLMBudget | null>;
}> {
  const [overview, governance, usage, ...budgets] = await Promise.all([
    adminFetch<AdminMindDashboard>("/admin/mind/overview"),
    adminFetch<AdminMindGovernance>("/admin/mind/settings"),
    adminFetch<AdminLLMUsageSummary>("/admin/mind/usage"),
    ...mindBudgetFlows.map((flow) => adminFetch<AdminLLMBudget | null>(`/admin/mind/budgets/${flow}`)),
  ]);
  return { overview, governance, usage, budgets };
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

export async function updateMindBudget(flow: string, monthlyBudgetBrl: number): Promise<AdminLLMBudget> {
  return adminFetch<AdminLLMBudget>(`/admin/mind/budgets/${flow}`, {
    method: "PUT",
    body: JSON.stringify({ monthly_budget_brl: monthlyBudgetBrl }),
  });
}
