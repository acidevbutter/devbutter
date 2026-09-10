"use server";

import { revalidatePath } from "next/cache";
import { AdminApiError } from "../api";
import {
  cancelPayment,
  createAccessToken,
  refundPayment,
  resendActivationLink,
  revokeAccessToken,
  updateSplitRule,
} from "../services/asaas";

export type AsaasActionState = { ok: true } | { ok: false; error: string } | null;

function toState(err: unknown): AsaasActionState {
  const detail =
    err instanceof AdminApiError
      ? String(err.detail ?? err.message)
      : "Não foi possível concluir a ação no Asaas.";
  return { ok: false, error: detail };
}

const CONFIG_PATH = "/admin/config/asaas";

export async function createAccessTokenAction(
  accountId: string,
  name: string
): Promise<AsaasActionState> {
  try {
    await createAccessToken(accountId, name);
    revalidatePath(CONFIG_PATH);
    return { ok: true };
  } catch (err) {
    return toState(err);
  }
}

export async function revokeAccessTokenAction(
  accountId: string,
  tokenId: string
): Promise<AsaasActionState> {
  try {
    await revokeAccessToken(accountId, tokenId);
    revalidatePath(CONFIG_PATH);
    return { ok: true };
  } catch (err) {
    return toState(err);
  }
}

export async function resendActivationLinkAction(accountId: string): Promise<AsaasActionState> {
  try {
    await resendActivationLink(accountId);
    revalidatePath(CONFIG_PATH);
    return { ok: true };
  } catch (err) {
    return toState(err);
  }
}

export async function toggleSplitRuleAction(
  accountId: string,
  ruleId: string,
  nextStatus: "ACTIVE" | "INACTIVE"
): Promise<AsaasActionState> {
  try {
    await updateSplitRule(accountId, ruleId, { status: nextStatus });
    revalidatePath(CONFIG_PATH);
    return { ok: true };
  } catch (err) {
    return toState(err);
  }
}

export async function refundPaymentAction(
  accountId: string,
  paymentId: string
): Promise<AsaasActionState> {
  try {
    await refundPayment(accountId, paymentId);
    revalidatePath(CONFIG_PATH);
    return { ok: true };
  } catch (err) {
    return toState(err);
  }
}

export async function cancelPaymentAction(
  accountId: string,
  paymentId: string
): Promise<AsaasActionState> {
  try {
    await cancelPayment(accountId, paymentId);
    revalidatePath(CONFIG_PATH);
    return { ok: true };
  } catch (err) {
    return toState(err);
  }
}
