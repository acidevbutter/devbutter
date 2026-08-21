"use server";

import { revalidatePath } from "next/cache";
import * as catalogService from "../services/catalog";
import type { ActionState } from "./types";

export async function saveCatalogEntryAction(
  entryId: string | null,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const type = String(formData.get("type") ?? "Produto") as "Produto" | "Serviço" | "Loja / ponto físico";
  const description = String(formData.get("description") ?? "").trim();

  if (!description) {
    return { error: "Descreva a entrada em uma frase." };
  }

  await catalogService.saveCatalogEntry({ id: entryId ?? undefined, type, description });
  revalidatePath("/portal/negocio");
  return null;
}

export async function deleteCatalogEntryAction(entryId: string): Promise<void> {
  await catalogService.deleteCatalogEntry(entryId);
  revalidatePath("/portal/negocio");
}
