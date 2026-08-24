"use server";

import { revalidatePath } from "next/cache";
import * as companiesService from "../services/companies";
import { AdminApiError } from "../api";

export type ActionState = { error: string } | null;

function errorMessage(err: unknown, fallback: string): string {
  return err instanceof AdminApiError ? String(err.detail ?? err.message) : fallback;
}

export async function setSplitQuotaAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = String(formData.get("split_quota_percent") ?? "").trim();
  const value = raw === "" ? null : Number(raw);
  if (value !== null && (Number.isNaN(value) || value < 0 || value > 100)) {
    return { error: "Informe um percentual entre 0 e 100, ou deixe em branco para remover o teto." };
  }

  try {
    await companiesService.setSplitQuota(companyId, value);
  } catch (err) {
    return { error: errorMessage(err, "Falha ao salvar a cota") };
  }
  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/admin/companies");
  return null;
}

export async function linkSubaccountAction(
  companyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const asaasAccountId = String(formData.get("asaas_account_id") ?? "").trim();
  if (!asaasAccountId) {
    return { error: "Informe o id da subconta Asaas a vincular." };
  }

  try {
    await companiesService.linkSubaccount(companyId, { asaas_account_id: asaasAccountId });
  } catch (err) {
    return { error: errorMessage(err, "Falha ao vincular a subconta") };
  }
  revalidatePath(`/admin/companies/${companyId}`);
  revalidatePath("/admin/companies");
  return null;
}

export async function enableFeatureAction(
  companyId: string,
  featureCode: string
): Promise<ActionState> {
  try {
    await companiesService.enableFeature(companyId, featureCode);
  } catch (err) {
    return { error: errorMessage(err, "Falha ao ativar a feature") };
  }
  revalidatePath(`/admin/companies/${companyId}`);
  return null;
}

export async function disableFeatureAction(
  companyId: string,
  featureCode: string
): Promise<ActionState> {
  try {
    await companiesService.disableFeature(companyId, featureCode);
  } catch (err) {
    return { error: errorMessage(err, "Falha ao desativar a feature") };
  }
  revalidatePath(`/admin/companies/${companyId}`);
  return null;
}
