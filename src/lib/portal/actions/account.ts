"use server";

import { revalidatePath } from "next/cache";
import { portalFetch } from "../api";
import type { ActionState } from "./types";

export async function saveAccountAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();

  if (!name) {
    return { error: "Informe seu nome." };
  }

  try {
    await portalFetch("/accounts/me", {
      method: "PATCH",
      body: JSON.stringify({
        name,
        phone: phone || null,
        business_name: businessName || null,
        document: document || null,
      }),
    });
  } catch {
    return { error: "Não foi possível salvar seus dados." };
  }

  revalidatePath("/portal/dados");
  revalidatePath("/portal");
  return null;
}
