import styles from "./PasswordRules.module.scss";

export type PasswordRule = { label: string; ok: boolean };

/** The live checklist on `/redefinir-senha`. Submit stays off until all pass. */
export function passwordRules(password: string, confirmation: string): PasswordRule[] {
  return [
    { label: "8 caracteres ou mais", ok: password.length >= 8 },
    { label: "pelo menos um número", ok: /\d/.test(password) },
    { label: "as duas iguais", ok: password.length > 0 && password === confirmation },
  ];
}

export default function PasswordRules({ rules, id }: { rules: PasswordRule[]; id: string }) {
  return (
    <ul id={id} className={styles.list}>
      {rules.map((rule) => (
        <li key={rule.label} className={`${styles.rule} ${rule.ok ? styles.ok : ""}`}>
          <span aria-hidden="true">{rule.ok ? "✓" : "○"}</span> {rule.label}
          <span className="sr-only">{rule.ok ? " — ok" : " — pendente"}</span>
        </li>
      ))}
    </ul>
  );
}
