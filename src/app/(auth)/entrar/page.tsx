import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "@/components/auth/AuthForm.module.scss";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Entrar",
  description: "Entre na sua conta DevButter para acompanhar orçamentos, projetos e faturas.",
};

export default function LoginPage() {
  return (
    <>
      <h1 className={styles.title}>Entrar</h1>
      <p className={styles.lede}>Acompanhe orçamentos, projetos e faturas.</p>
      {/* LoginForm reads ?next= / ?intent= with useSearchParams. */}
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </>
  );
}
