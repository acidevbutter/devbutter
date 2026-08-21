import { getPortalAccount } from "@/lib/portal/session";
import AccountForm from "./AccountForm";

export default async function PortalAccountPage() {
  const account = await getPortalAccount();
  return <AccountForm account={account} />;
}
