import styles from "./PasswordStrength.module.scss";

const LABELS = ["fraca", "fraca", "boa", "forte"] as const;

/** 0–3: one point each for 8+ chars, a digit, an uppercase letter or symbol. */
export function passwordScore(password: string): number {
  return (
    Number(password.length >= 8) +
    Number(/\d/.test(password)) +
    Number(/[A-Z]|[^\w]/.test(password))
  );
}

/**
 * Three-bar meter under "senha" on `/criar-conta`. `id` lands on the label so
 * the password input can point `aria-describedby` at it.
 */
export default function PasswordStrength({ password, id }: { password: string; id: string }) {
  const score = passwordScore(password);
  const label = password ? LABELS[score] : "8 caracteres ou mais";

  return (
    <div className={styles.root}>
      <div className={styles.bars} aria-hidden="true">
        {[1, 2, 3].map((step) => (
          <i key={step} className={`${styles.bar} ${score >= step ? styles.on : ""}`} />
        ))}
      </div>
      <div id={id} className={styles.label} aria-live="polite">
        {password && <span className="sr-only">força da senha: </span>}
        {label}
      </div>
    </div>
  );
}
