"use client";

import { useEffect, useState } from "react";
import {
  listPortalPaymentMethods,
  payWithPortalPaymentMethod,
  revokePortalPaymentMethod,
  type PaymentMethodSummary,
} from "@/lib/portal/payment-methods";
import styles from "./PaymentMethods.module.scss";

type PaymentMethodsProps = {
  invoiceId: string;
  onPaymentSubmitted?: (state: string) => void;
};

export default function PaymentMethods({ invoiceId, onPaymentSubmitted }: PaymentMethodsProps) {
  const [methods, setMethods] = useState<PaymentMethodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listPortalPaymentMethods()
      .then((items) => {
        if (active) setMethods(items);
      })
      .catch(() => {
        if (active) setError("não foi possível carregar os cartões salvos");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  async function handlePay(paymentMethodId: string) {
    setBusyId(paymentMethodId);
    setError(null);
    try {
      const result = await payWithPortalPaymentMethod(invoiceId, paymentMethodId);
      onPaymentSubmitted?.(result.state);
    } catch {
      setError("não foi possível iniciar a cobrança");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRevoke(paymentMethodId: string) {
    setBusyId(paymentMethodId);
    setError(null);
    try {
      await revokePortalPaymentMethod(paymentMethodId);
      setMethods((current) => current.filter((method) => method.id !== paymentMethodId));
    } catch {
      setError("não foi possível revogar o cartão");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className={styles.feedback}>carregando cartões salvos…</div>;

  return (
    <div className={styles.panel}>
      <div className={styles.heading}>cartões salvos</div>
      {methods.length === 0 ? (
        <div className={styles.feedback}>nenhum cartão salvo disponível</div>
      ) : (
        <div className={styles.list}>
          {methods.map((method) => (
            <div className={styles.method} key={method.id}>
              <div>
                <strong>{method.brand} •••• {method.last4}</strong>
                <span>válido até {String(method.expiry_month).padStart(2, "0")}/{method.expiry_year}</span>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.pay}
                  disabled={busyId !== null}
                  onClick={() => handlePay(method.id)}
                >
                  {busyId === method.id ? "enviando…" : "usar cartão"}
                </button>
                <button
                  type="button"
                  className={styles.revoke}
                  disabled={busyId !== null}
                  onClick={() => handleRevoke(method.id)}
                >
                  revogar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {error && <div className={styles.error}>{error}</div>}
      <div className={styles.note}>a cobrança será confirmada pelo webhook da Asaas</div>
    </div>
  );
}
