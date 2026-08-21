"use server";

import { revalidatePath } from "next/cache";
import * as knowledgeService from "../services/knowledge";
import type { ActionState } from "./quotes";

export async function saveKnowledgeEntryAction(
  entryId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = String(formData.get("name") ?? "");
  const description = String(formData.get("description") ?? "");
  const priceMin = String(formData.get("price_min") ?? "");
  const priceMax = String(formData.get("price_max") ?? "");
  const typicalDuration = String(formData.get("typical_duration") ?? "");
  const aiInstructions = String(formData.get("ai_instructions") ?? "");

  if (!name || !priceMin || !priceMax) {
    return { error: "Preencha nome e faixa de preço." };
  }

  await knowledgeService.saveKnowledgeEntry({
    id: entryId ?? undefined,
    name,
    description,
    price_min: priceMin,
    price_max: priceMax,
    typical_duration: typicalDuration,
    ai_instructions: aiInstructions,
  });

  revalidatePath("/admin/knowledge");
  return null;
}

export async function deleteKnowledgeEntryAction(entryId: string): Promise<void> {
  await knowledgeService.deleteKnowledgeEntry(entryId);
  revalidatePath("/admin/knowledge");
}
