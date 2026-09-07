"use client";

import { useEffect, useState } from "react";
import type { SubaccountCommercialInfo } from "@/lib/portal/types";
import styles from "./Recebimentos.module.scss";

type Props = {
  expired: boolean;
  onConfirmed?: () => void;
};

type LoadState = "loading" | "ready" | "error";

export default function CommercialInfoForm({ expired, onConfirmed }: Props) {
  const [load, setLoad] = useState<LoadState>("loading");
  const [base, setBase] = useState<SubaccountCommercialInfo | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [incomeValue, setIncomeValue] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [address, setAddress] = useState("");
  const [complement, setComplement] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/recebimentos/commercial-info");
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as SubaccountCommercialInfo;
        if (cancelled) return;
        setBase(data);
        const names = data.availableCompanyNames ?? [];
        setCompanyName(data.companyName ?? names[0] ?? "");
        setIncomeValue(data.incomeValue != null ? String(data.incomeValue) : "");
        setPostalCode(data.postalCode ?? "");
        setAddress(data.address ?? "");
        setComplement(data.complement ?? "");
        setLoad("ready");
      } catch {
        if (!cancelled) setLoad("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableNames = base?.availableCompanyNames ?? [];

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const income = Number(incomeValue.replace(/\./g, "").replace(",", "."));
    if (!Number.isFinite(income) || income <= 0) {
      setError("Informe o faturamento mensal.");
      return;
    }
    // Asaas §20: only a name returned by Asaas is accepted.
    if (availableNames.length > 0 && !availableNames.includes(companyName)) {
      setError("Selecione uma das razões sociais disponíveis.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        ...(base ?? {}),
        incomeValue: income,
        postalCode: postalCode || null,
        address: address || null,
        complement: complement || null,
      };
      if (companyName) payload.companyName = companyName;

      const res = await fetch("/api/portal/recebimentos/commercial-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        setError(
          typeof detail?.error === "string"
            ? detail.error
            : "Não foi possível confirmar os dados. Tente de novo."
        );
        return;
      }
      setDone(true);
      onConfirmed?.();
    } catch {
      setError("Falha de conexão. Tente de novo.");
    } finally {
      setSubmitting(false);
    }
  }

  if (load === "loading") {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}>Dados comerciais</div>
        <div className={styles.cardBody}>
          <p className={styles.cardText}>Carregando seus dados…</p>
        </div>
      </div>
    );
  }

  if (load === "error") {
    return (
      <div className={styles.card}>
        <div className={styles.cardHead}>Dados comerciais</div>
        <div className={styles.cardBody}>
          <p className={styles.cardText}>
            Não foi possível carregar os dados comerciais agora. Atualize a página em instantes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form className={styles.card} onSubmit={onSubmit}>
      <div className={styles.cardHead}>Dados comerciais</div>
      <div className={styles.formGrid}>
        <div className={styles.formFull}>
          <div className={styles.fieldLabel}>razão social / nome</div>
          {availableNames.length > 0 ? (
            <select
              className={styles.field}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            >
              {availableNames.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={styles.field}
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
            />
          )}
          <div className={styles.fieldHint}>apenas os nomes retornados pela Asaas são aceitos</div>
        </div>

        <div>
          <div className={styles.fieldLabel}>faturamento mensal</div>
          <input
            className={styles.field}
            inputMode="decimal"
            value={incomeValue}
            onChange={(e) => setIncomeValue(e.target.value)}
            placeholder="42000"
          />
        </div>
        <div>
          <div className={styles.fieldLabel}>cep</div>
          <input
            className={styles.field}
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
          />
        </div>
        <div>
          <div className={styles.fieldLabel}>endereço</div>
          <input
            className={styles.field}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div>
          <div className={styles.fieldLabel}>complemento</div>
          <input
            className={styles.field}
            value={complement}
            onChange={(e) => setComplement(e.target.value)}
          />
        </div>
      </div>

      {error && <div className={styles.errorText}>{error}</div>}
      {done && <div className={styles.okText}>Dados comerciais confirmados.</div>}

      <div className={styles.cardActions}>
        <button
          type="submit"
          className={expired ? styles.btnDanger : styles.btnSolid}
          disabled={submitting || done}
        >
          {submitting
            ? "Enviando…"
            : expired
              ? "Regularizar agora"
              : "Confirmar dados"}
        </button>
      </div>
    </form>
  );
}
