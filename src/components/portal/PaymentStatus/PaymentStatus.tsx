import Link from "next/link";
import styles from "./PaymentStatus.module.scss";

// Maps the state string returned by payWithPortalPaymentMethod / the Asaas
// webhook mirror onto a customer-facing badge. Unknown strings fall back to
// the neutral "error" shape rather than leaking a raw enum.
type Kind = "pending" | "ok" | "failed" | "error";

const KIND_BY_STATE: Record<string, Kind> = {
  PENDING: "pending",
  AWAITING_RISK_ANALYSIS: "pending",
  CONFIRMED: "ok",
  RECEIVED: "ok",
  RECEIVED_IN_CASH: "ok",
  REFUSED: "failed",
  DECLINED: "failed",
  FAILED: "failed",
  ERROR: "error",
};

const COPY: Record<Kind, { label: string; body: string }> = {
  pending: {
    label: "Aguardando confirmação",
    body: "A cobrança foi enviada. A confirmação costuma levar alguns minutos — você não precisa fazer mais nada agora.",
  },
  ok: {
    label: "Pagamento aprovado",
    body: "Recebemos seu pagamento. A fatura será atualizada em instantes.",
  },
  failed: {
    label: "Pagamento recusado",
    body: "O pagamento não foi autorizado. Tente outro método ou outro cartão.",
  },
  error: {
    label: "Não foi possível processar",
    body: "Algo deu errado ao processar a cobrança. Tente novamente em alguns instantes.",
  },
};

export default function PaymentStatus({
  state,
  invoiceHref,
  onRetry,
}: {
  state: string;
  invoiceHref?: string;
  onRetry?: () => void;
}) {
  const kind = KIND_BY_STATE[state?.toUpperCase?.() ?? ""] ?? "error";
  const copy = COPY[kind];

  return (
    <div className={`${styles.wrap} ${styles[kind]}`}>
      <div className={styles.head}>
        <span className={styles.dot} />
        <span className={styles.label}>{copy.label}</span>
      </div>
      <p className={styles.body}>{copy.body}</p>

      {kind === "ok" && invoiceHref && (
        <Link href={invoiceHref} className={styles.action}>
          ver fatura
        </Link>
      )}
      {kind === "failed" && onRetry && (
        <button type="button" className={styles.action} onClick={onRetry}>
          tentar outro método
        </button>
      )}
      {kind === "error" && onRetry && (
        <button type="button" className={styles.action} onClick={onRetry}>
          tentar novamente
        </button>
      )}
    </div>
  );
}
