import { redirect } from "next/navigation";
import PortalShell from "@/components/portal/PortalShell/PortalShell";
import { getPortalAccount, PortalUnauthenticatedError } from "@/lib/portal/session";

export default async function PortalDashboardLayout({ children }: { children: React.ReactNode }) {
  let account;
  try {
    account = await getPortalAccount();
  } catch (err) {
    if (err instanceof PortalUnauthenticatedError) {
      redirect("/portal/sessao-expirada");
    }
    throw err;
  }

  return (
    <PortalShell accountName={account.name} businessName={account.businessName}>
      {children}
    </PortalShell>
  );
}
