import type { Metadata } from "next";
import ForgotPassword from "./ForgotPassword";

export const metadata: Metadata = {
  title: "Esqueci a senha",
  description: "Receba por e-mail um link para criar uma nova senha da sua conta DevButter.",
};

export default function ForgotPasswordPage() {
  return <ForgotPassword />;
}
