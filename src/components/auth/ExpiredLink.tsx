import Button from "@/components/admin/ui/Button/Button";
import styles from "./AuthForm.module.scss";

/** "Esse link expirou" — `/link-expirado`, and `/redefinir-senha` without a token. */
export default function ExpiredLink() {
  return (
    <div className={styles.center}>
      <div className={`${styles.badge} ${styles.badgeExpired}`} aria-hidden="true">
        !
      </div>
      <h1 className={styles.title}>Esse link expirou</h1>
      <p className={`${styles.body} ${styles.bodySpaced}`}>
        Por segurança, links de senha valem 30 minutos e funcionam uma vez só. Peça um novo — leva
        um minuto.
      </p>
      <Button variant="solid" href="/esqueci-senha" className={styles.action}>
        Pedir novo link
      </Button>
    </div>
  );
}
