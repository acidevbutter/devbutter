"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  listPortalPaymentMethods,
  revokePortalPaymentMethod,
  type PaymentMethodSummary,
} from "@/lib/portal/payment-methods";
import styles from "./SavedCards.module.scss";

export default function SavedCardsClient() {
  const [methods, setMethods] = useState<PaymentMethodSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    listPortalPaymentMethods()
      .then((items) => active && setMethods(items))
      .catch(() => active && setError("não foi possível carregar seus cartões salvos"))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const active = methods.filter((m) => m.status === "active" && !m.revoked_at);
  const confirmTarget = methods.find((m) => m.id === confirmId) ?? null;

  async function remove(id: string) {
    setBusyId(id);
    setError(null);
    setConfirmId(null);
    try {
      await revokePortalPaymentMethod(id);
      setMethods((current) => current.filter((m) => m.id !== id));
    } catch {
      setError("não foi possível remover o cartão — tente novamente");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.crumb}>
        <Link href="/portal/dados">Meus dados</Link> / Meios de pagamento
      </div>
      <h1 className={styles.title}>Cartões salvos</h1>
      <p className={styles.intro}>
        Cartões que você guardou para pagar faturas mais rápido. Os dados do cartão ficam com o
        provedor de pagamento — aqui mostramos só a bandeira e os últimos dígitos.
      </p>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.feedback}>carregando…</div>
      ) : active.length === 0 ? (
        <div className={styles.empty}>você ainda não tem cartões salvos</div>
      ) : (
        <div className={styles.list}>
          {active.map((method, i) => (
            <div className={styles.card} key={method.id}>
              <div className={styles.cardInfo}>
                <span className={styles.cardBrand}>
                  {method.brand} •••• {method.last4}
                  {i === 0 && <span className={styles.defaultBadge}>padrão</span>}
                </span>
                <span className={styles.cardMeta}>
                  válido até {String(method.expiry_month).padStart(2, "0")}/{method.expiry_year}
                </span>
              </div>
              <button
                type="button"
                className={styles.removeBtn}
                disabled={busyId !== null}
                onClick={() => setConfirmId(method.id)}
              >
                {busyId === method.id ? "removendo…" : "remover"}
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.addRow}>
        <button type="button" className={styles.addBtn} disabled title="disponível ao pagar uma fatura">
          Adicionar cartão
        </button>
        <span className={styles.addNote}>
          novos cartões são salvos ao pagar uma fatura em <Link href="/portal/faturas">Faturas</Link>
        </span>
      </div>

      {confirmTarget && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>Remover cartão</h2>
            <p className={styles.modalBody}>
              O cartão {confirmTarget.brand} •••• {confirmTarget.last4} será desvinculado da sua
              conta. Você poderá salvá-lo de novo em um próximo pagamento.
            </p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostBtn} onClick={() => setConfirmId(null)}>
                Voltar
              </button>
              <button
                type="button"
                className={styles.removeBtn}
                onClick={() => remove(confirmTarget.id)}
              >
                Remover cartão
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
