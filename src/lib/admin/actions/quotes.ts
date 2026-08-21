"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as quotesService from "../services/quotes";
import { AdminApiError } from "../api";

export type ActionState = { error: string } | null;

export async function rejectQuoteAction(quoteId: string): Promise<ActionState> {
  try {
    await quotesService.rejectQuote(quoteId);
  } catch (err) {
    return { error: err instanceof AdminApiError ? String(err.detail ?? err.message) : "Falha ao rejeitar" };
  }
  revalidatePath("/admin/quotes");
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/dashboard");
  return null;
}

export async function editQuoteAction(
  quoteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    await quotesService.editQuote(quoteId, {
      scope_summary: String(formData.get("scope_summary") ?? ""),
      price_range: String(formData.get("price_range") ?? "") || null,
      timeline: String(formData.get("timeline") ?? "") || null,
    });
  } catch (err) {
    return { error: err instanceof AdminApiError ? String(err.detail ?? err.message) : "Falha ao salvar" };
  }
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  return null;
}

export async function approveQuoteAction(
  quoteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const amount = String(formData.get("amount") ?? "");
  const dueDate = String(formData.get("due_date") ?? "");
  const billingType = String(formData.get("billing_type") ?? "UNDEFINED");

  if (!amount || !dueDate) {
    return { error: "Informe o valor e a data de vencimento." };
  }

  let order;
  try {
    order = await quotesService.approveQuote(quoteId, {
      amount,
      due_date: dueDate,
      billing_type: billingType as "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED",
    });
  } catch (err) {
    return { error: err instanceof AdminApiError ? String(err.detail ?? err.message) : "Falha ao aprovar" };
  }

  revalidatePath("/admin/quotes");
  revalidatePath("/admin/dashboard");
  redirect(`/admin/orders/${order.id}`);
}

export async function createManualQuoteAction(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const accountId = String(formData.get("account_id") ?? "");
  const scopeSummary = String(formData.get("scope_summary") ?? "");
  const priceMin = String(formData.get("price_min") ?? "");
  const priceMax = String(formData.get("price_max") ?? "");
  const timeline = String(formData.get("timeline") ?? "");

  if (!accountId || !scopeSummary || !priceMin || !priceMax) {
    return { error: "Preencha cliente, escopo e faixa de preço." };
  }

  let quote;
  try {
    quote = await quotesService.createManualQuote({
      account_id: accountId,
      scope_summary: scopeSummary,
      price_range: `${priceMin}–${priceMax}`,
      timeline: timeline || null,
    });
  } catch (err) {
    return {
      error: err instanceof AdminApiError ? String(err.detail ?? err.message) : "Falha ao criar quote",
    };
  }

  revalidatePath("/admin/quotes");
  redirect(`/admin/quotes/${quote.id}`);
}
