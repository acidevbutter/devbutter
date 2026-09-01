import { redirect } from "next/navigation";

/**
 * There is a single login screen (/portal/login). It already promotes admins
 * to the internal panel after authenticating, so /admin/login just forwards
 * there, preserving the originally requested admin path via ?next=.
 */
export default async function AdminLoginRedirect({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const safeNext =
    next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin/dashboard";
  redirect(`/portal/login?next=${encodeURIComponent(safeNext)}`);
}
