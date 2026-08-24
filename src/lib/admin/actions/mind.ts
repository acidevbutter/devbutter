"use server";

import { revalidatePath } from "next/cache";
import { updateMindBudget, updateMindGovernance } from "../services/mind";

function numberValue(formData: FormData, field: string): number {
  const value = Number(formData.get(field));
  if (!Number.isFinite(value)) throw new Error(`Valor inválido para ${field}`);
  return value;
}

export async function updateMindGovernanceAction(formData: FormData): Promise<void> {
  await updateMindGovernance({
    diagnosis_max_output_tokens: numberValue(formData, "diagnosis_max_output_tokens"),
    diagnosis_max_history_messages: numberValue(formData, "diagnosis_max_history_messages"),
    diagnosis_max_turns: numberValue(formData, "diagnosis_max_turns"),
    diagnosis_grounding_top_k: numberValue(formData, "diagnosis_grounding_top_k"),
    diagnosis_grounding_min_score: numberValue(formData, "diagnosis_grounding_min_score"),
  });
  revalidatePath("/admin/mind");
}

export async function updateMindBudgetAction(flow: string, formData: FormData): Promise<void> {
  await updateMindBudget(flow, numberValue(formData, "monthly_budget_brl"));
  revalidatePath("/admin/mind");
}
