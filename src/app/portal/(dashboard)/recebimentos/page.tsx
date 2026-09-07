import { getPortalAccount } from "@/lib/portal/session";
import { getSubaccountOnboarding } from "@/lib/portal/services/recebimentos";
import RecebimentosClient from "./RecebimentosClient";

export default async function PortalRecebimentosPage() {
  const account = await getPortalAccount();
  // The onboarding detail is optional: `not_provisioned` / `CREATION_FAILED`
  // accounts have nothing to show here and the endpoint may 4xx.
  const onboarding = await getSubaccountOnboarding().catch(() => null);

  return (
    <RecebimentosClient
      companyName={account.businessName ?? account.name}
      onboardingRequired={account.onboardingRequired}
      subaccount={account.subaccount}
      onboarding={onboarding}
    />
  );
}
