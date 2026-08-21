"use server";

import { revalidatePath } from "next/cache";
import { mockAccount } from "../mock/data";
import type { ActionState } from "./types";

// MOCKED: mutates the single in-memory mockAccount record — fine for a demo
// session, not real persistence. Email/password aren't editable here since
// there's no real auth behind them yet.
export async function saveAccountAction(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const businessName = String(formData.get("business_name") ?? "").trim();
  const document = String(formData.get("document") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  if (!name) {
    return { error: "Informe seu nome." };
  }

  mockAccount.name = name;
  mockAccount.phone = phone || null;
  mockAccount.businessName = businessName || null;
  mockAccount.document = document || null;
  mockAccount.address = address || null;

  revalidatePath("/portal/dados");
  revalidatePath("/portal");
  return null;
}
