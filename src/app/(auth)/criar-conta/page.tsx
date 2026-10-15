import type { Metadata } from "next";
import { Suspense } from "react";
import styles from "@/components/auth/AuthForm.module.scss";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta DevButter para acompanhar o orçamento, o projeto e as faturas.",
};

export default function SignupPage() {
  return (
    <>
      <h1 className={styles.title}>Criar conta</h1>
      <p className={`${styles.lede} ${styles.ledeTight}`}>
        É por aqui que você acompanha o orçamento, o projeto e as faturas.
      </p>
      {/* SignupForm reads ?next= / ?intent= / ?origem= with useSearchParams. */}
      <Suspense fallback={null}>
        <SignupForm />
      </Suspense>
    </>
  );
}
