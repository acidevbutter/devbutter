import { AdminApiError } from "@/lib/admin/api";
import {
  listAccessTokens,
  listAuditLogs,
  listPayments,
  listSplitRules,
  listSubaccounts,
  unwrapList,
  type AsaasAccessToken,
  type AsaasAuditLog,
  type AsaasPayment,
  type AsaasSplitRule,
  type AsaasSubaccount,
} from "@/lib/admin/services/asaas";
import AsaasConfigClient, { type AsaasTab } from "./AsaasConfigClient";

const TABS: AsaasTab[] = ["subcontas", "tokens", "split", "pagamentos", "auditoria"];

function detail(err: unknown): string {
  return err instanceof AdminApiError
    ? String(err.detail ?? err.message)
    : "Falha ao consultar o Asaas pelo backend.";
}

export default async function AdminAsaasConfigPage({
  searchParams,
}: {
  searchParams: Promise<{ sub?: string; tab?: string }>;
}) {
  const { sub, tab: rawTab } = await searchParams;
  const tab: AsaasTab = TABS.includes(rawTab as AsaasTab) ? (rawTab as AsaasTab) : "subcontas";

  let subaccounts: AsaasSubaccount[] = [];
  let connectionError: string | null = null;
  try {
    subaccounts = unwrapList(await listSubaccounts({ limit: 100 }));
  } catch (err) {
    connectionError = detail(err);
  }
  const connected = connectionError === null;
  const activeSub = sub ?? subaccounts[0]?.id ?? null;

  const tabData = {
    tokens: [] as AsaasAccessToken[],
    splitRules: [] as AsaasSplitRule[],
    payments: [] as AsaasPayment[],
    auditLogs: [] as AsaasAuditLog[],
    error: null as string | null,
  };

  try {
    if (tab === "tokens" && activeSub) {
      tabData.tokens = unwrapList(await listAccessTokens(activeSub));
    } else if (tab === "split" && activeSub) {
      tabData.splitRules = await listSplitRules(activeSub);
    } else if (tab === "pagamentos" && activeSub) {
      tabData.payments = unwrapList(await listPayments(activeSub, { limit: 50 }));
    } else if (tab === "auditoria") {
      tabData.auditLogs = unwrapList(await listAuditLogs({ limit: 50 }));
    }
  } catch (err) {
    tabData.error = detail(err);
  }

  return (
    <AsaasConfigClient
      connected={connected}
      connectionError={connectionError}
      subaccounts={subaccounts}
      activeSub={activeSub}
      tab={tab}
      data={tabData}
    />
  );
}
