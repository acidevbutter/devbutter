import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell/AdminShell";
import { adminFetch, AdminUnauthenticatedError } from "@/lib/admin/api";
import { listReviewQueue } from "@/lib/admin/services/quotes";
import type { AccountRead } from "@/lib/admin/types";

export default async function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  let account: AccountRead;
  let pendingQuotesCount = 0;

  try {
    [account, pendingQuotesCount] = await Promise.all([
      adminFetch<AccountRead>("/accounts/me"),
      listReviewQueue().then((q) => q.length),
    ]);
  } catch (err) {
    if (err instanceof AdminUnauthenticatedError) {
      redirect("/portal/login?next=/admin/dashboard");
    }
    throw err;
  }

  return (
    <AdminShell accountName={account.name} pendingQuotesCount={pendingQuotesCount}>
      {children}
    </AdminShell>
  );
}
