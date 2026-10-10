import type { Metadata } from "next";
import { Suspense } from "react";
import ResetPassword from "./ResetPassword";

export const metadata: Metadata = {
  title: "Nova senha",
  description: "Crie uma nova senha para a sua conta DevButter.",
  // The recovery token rides in ?token= — never leak it through Referer.
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return (
    // ResetPassword reads ?token= with useSearchParams.
    <Suspense fallback={null}>
      <ResetPassword />
    </Suspense>
  );
}
