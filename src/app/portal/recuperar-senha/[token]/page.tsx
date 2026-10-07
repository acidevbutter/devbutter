import { redirect } from "next/navigation";

/**
 * The backend's recovery e-mail links here (`${FRONTEND}/portal/recuperar-senha/{token}`);
 * the screen itself lives at `/redefinir-senha?token=` in the account shell.
 */
export default async function RecoverPasswordRedirect({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  redirect(`/redefinir-senha?token=${encodeURIComponent(token)}`);
}
