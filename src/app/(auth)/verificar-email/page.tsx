import type { Metadata } from "next";
import VerifyEmail from "./VerifyEmail";

export const metadata: Metadata = {
  title: "Confirme seu e-mail",
  description: "Abra o link que mandamos para o seu e-mail para entrar na conta DevButter.",
};

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
