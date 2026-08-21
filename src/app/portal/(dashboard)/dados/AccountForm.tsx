"use client";

import { useActionState } from "react";
import { saveAccountAction } from "@/lib/portal/actions/account";
import type { ActionState } from "@/lib/portal/actions/types";
import type { PortalAccount } from "@/lib/portal/types";
import styles from "./Account.module.scss";

export default function AccountForm({ account }: { account: PortalAccount }) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(saveAccountAction, null);

  return (
    <form className={styles.page} action={formAction}>
      <h1 className={styles.title}>Meus dados</h1>

      <div className={styles.sec}>
        <div className={styles.kick}>contato</div>
        <div className={styles.label}>nome</div>
        <input className={styles.field} name="name" defaultValue={account.name} />
        <div className={styles.label}>e-mail</div>
        <input className={styles.field} value={account.email} disabled />
        <div className={styles.label}>telefone</div>
        <input className={styles.field} name="phone" defaultValue={account.phone ?? ""} />
      </div>

      <div className={styles.sec}>
        <div className={styles.kick}>dados de faturamento</div>
        <div className={styles.warnCard}>
          Estes dados já são usados para emitir suas faturas. Se algo mudar, atualize antes da próxima
          cobrança.
        </div>
        <div className={styles.label}>razão social / nome</div>
        <input className={styles.field} name="business_name" defaultValue={account.businessName ?? ""} />
        <div className={styles.label}>CNPJ / CPF</div>
        <input className={styles.field} name="document" defaultValue={account.document ?? ""} />
      </div>

      <div className={styles.sec}>
        <div className={styles.kick}>segurança</div>
        <div className={styles.label}>senha atual</div>
        <input className={styles.field} type="password" disabled placeholder="não disponível nesta demo" />
        <div className={styles.label}>nova senha</div>
        <input className={styles.field} type="password" disabled placeholder="mínimo 8 caracteres" />
      </div>

      {state?.error && <div className={styles.error}>{state.error}</div>}

      <div className={styles.actions}>
        <button type="submit" className={styles.save} disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
        <button type="reset" className={styles.discard}>
          Descartar
        </button>
      </div>
    </form>
  );
}
