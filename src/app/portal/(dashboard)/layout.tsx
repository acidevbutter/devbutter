import { redirect } from "next/navigation";
import PortalShell from "@/components/portal/PortalShell/PortalShell";
import { getPortalAccount, PortalUnauthenticatedError } from "@/lib/portal/session";

export default async function PortalDashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    const account = await getPortalAccount();
    return (
      <PortalShell accountName={account.name} businessName={account.businessName}>
        {children}
      </PortalShell>
    );
  } catch (err) {
    if (err instanceof PortalUnauthenticatedError) {
      redirect("/portal/login");
    }
    throw err;
  }
}
