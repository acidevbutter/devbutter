"use client";

import { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/admin/format";
import { describePayment } from "@/lib/portal/payment-label";
import styles from "./PixBoletoView.module.scss";

// Renders whatever the invoice actually carries from Asaas: a Pix
// copia-e-cola string and/or a boleto URL. No fabricated QR image — if the
// backend hasn't returned payment data yet, we say so.
export default function PixBoletoView({
  pixCode,
  boletoUrl,
  billingType,
  amount,
  dueDate,
  projectTitle,
}: {
  pixCode: string | null;
  boletoUrl: string | null;
  billingType: string | null;
  amount: string;
  dueDate: string;
  projectTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const view = describePayment(billingType, pixCode, !!boletoUrl);

  if (!pixCode && !boletoUrl) {
    return (
      <div className={styles.empty}>
        os dados de pagamento ainda não vieram do Asaas para esta fatura
      </div>
    );
  }

  function copy() {
    if (!pixCode) return;
    navigator.clipboard?.writeText(pixCode).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => setCopied(false)
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.method}>{view.method}</span>
        <span className={styles.pending}>aguardando pagamento</span>
      </div>

      {pixCode && (
        <div className={styles.codeBox}>
          <span className={styles.code}>{pixCode}</span>
          <button type="button" className={styles.copyBtn} onClick={copy}>
            {copied ? "copiado" : "copiar"}
          </button>
        </div>
      )}

      {boletoUrl && view.linkLabel && (
        <a className={styles.boletoLink} href={boletoUrl} target="_blank" rel="noreferrer">
          {view.linkLabel}
        </a>
      )}

      <div className={styles.meta}>
        {formatCurrency(amount)} · vence em {formatDate(dueDate)} · {projectTitle}
      </div>
    </div>
  );
}
