"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import * as quotesService from "../services/quotes";
import * as clientsService from "../services/clients";
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
  // The detail screen edits price as split min/max fields (matching the
  // "faixa de preço (R$)" design); fall back to a single price_range input.
  const priceMin = String(formData.get("price_min") ?? "").trim();
  const priceMax = String(formData.get("price_max") ?? "").trim();
  const priceRange =
    priceMin || priceMax
      ? [priceMin, priceMax].filter(Boolean).join("–")
      : String(formData.get("price_range") ?? "").trim();

  // deliverables arrive as repeated `deliverable` fields; blank lines dropped.
  const deliverables = formData
    .getAll("deliverable")
    .map((d) => String(d).trim())
    .filter(Boolean);

  try {
    await quotesService.editQuote(quoteId, {
      scope_summary: String(formData.get("scope_summary") ?? ""),
      deliverables,
      internal_notes: String(formData.get("internal_notes") ?? "") || null,
      price_range: priceRange || null,
      timeline: String(formData.get("timeline") ?? "") || null,
    });
  } catch (err) {
    return { error: err instanceof AdminApiError ? String(err.detail ?? err.message) : "Falha ao salvar" };
  }
  revalidatePath(`/admin/quotes/${quoteId}`);
  revalidatePath("/admin/quotes");
  return null;
}

// 4xx details are already human (e.g. the 422 asking for CPF/CNPJ); 5xx means the
// billing provider failed and its raw message is not useful to the admin.
function approveErrorMessage(err: unknown): string {
  if (err instanceof AdminApiError) {
    if (err.status >= 500) {
      return "Não foi possível criar a cobrança agora (falha no provedor de pagamento). Os valores foram mantidos; tente novamente.";
    }
    return String(err.detail ?? err.message);
  }
  return "Falha ao aprovar";
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
    return { error: approveErrorMessage(err) };
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

export async function updateClientDocumentAction(
  accountId: string,
  quoteId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const document = String(formData.get("document") ?? "").replace(/\D/g, "");
  if (document.length !== 11 && document.length !== 14) {
    return { error: "Informe um CPF (11 dígitos) ou CNPJ (14 dígitos) válido." };
  }
  try {
    await clientsService.updateClientDocument(
      accountId,
      document.length === 11 ? { cpf: document } : { cnpj: document }
    );
  } catch (err) {
    return { error: err instanceof AdminApiError ? String(err.detail ?? err.message) : "Falha ao salvar o documento" };
  }
  revalidatePath(`/admin/quotes/${quoteId}`);
  return null;
}
