"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  cancelPaymentAction,
  createAccessTokenAction,
  refundPaymentAction,
  resendActivationLinkAction,
  revokeAccessTokenAction,
  toggleSplitRuleAction,
  type AsaasActionState,
} from "@/lib/admin/actions/asaas";
import type {
  AsaasAccessToken,
  AsaasAuditLog,
  AsaasPayment,
  AsaasSplitRule,
  AsaasSubaccount,
} from "@/lib/admin/asaas-types";
import { maskTail } from "@/lib/admin/asaas-types";
import { formatCurrency, formatDateTime } from "@/lib/admin/format";
import styles from "./AsaasConfig.module.scss";

export type AsaasTab = "subcontas" | "tokens" | "split" | "pagamentos" | "auditoria";

const TABS: Array<{ key: AsaasTab; label: string }> = [
  { key: "subcontas", label: "Subcontas" },
  { key: "tokens", label: "Tokens" },
  { key: "split", label: "Split" },
  { key: "pagamentos", label: "Pagamentos" },
  { key: "auditoria", label: "Auditoria" },
];

type TabData = {
  tokens: AsaasAccessToken[];
  splitRules: AsaasSplitRule[];
  payments: AsaasPayment[];
  auditLogs: AsaasAuditLog[];
  error: string | null;
};

type PendingConfirm = {
  title: string;
  body: string;
  run: () => Promise<AsaasActionState>;
};

export default function AsaasConfigClient({
  connected,
  connectionError,
  subaccounts,
  activeSub,
  tab,
  data,
}: {
  connected: boolean;
  connectionError: string | null;
  subaccounts: AsaasSubaccount[];
  activeSub: string | null;
  tab: AsaasTab;
  data: TabData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const activeLabel = useMemo(() => {
    const found = subaccounts.find((s) => s.id === activeSub);
    return found?.name ?? found?.email ?? activeSub ?? "—";
  }, [subaccounts, activeSub]);

  function hrefFor(nextTab: AsaasTab, sub = activeSub) {
    const params = new URLSearchParams();
    if (sub) params.set("sub", sub);
    params.set("tab", nextTab);
    return `/admin/config/asaas?${params.toString()}`;
  }

  function runConfirmed() {
    if (!confirm) return;
    const job = confirm;
    setConfirm(null);
    setActionError(null);
    startTransition(async () => {
      const result = await job.run();
      if (result && !result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/admin/config">Configurações</Link> / Asaas
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Configurações · Asaas</h1>
        <div className={styles.headerRight}>
          <span
            className={`${styles.statusBadge} ${connected ? styles.statusOk : styles.statusError}`}
          >
            {connected ? "conexão ativa" : "erro de conexão"}
          </span>
          <span className={styles.envPill}>ambiente definido no backend</span>
          <button
            type="button"
            className={styles.testBtn}
            onClick={() => startTransition(() => router.refresh())}
            disabled={pending}
          >
            {pending ? "testando…" : "Testar conexão"}
          </button>
        </div>
      </div>

      {connectionError && <div className={styles.errorBanner}>{connectionError}</div>}

      <div className={styles.subPicker}>
        <span className={styles.mono}>subconta</span>
        <select
          className={styles.subSelect}
          value={activeSub ?? ""}
          onChange={(e) => router.push(hrefFor(tab, e.target.value || null))}
          disabled={subaccounts.length === 0}
        >
          {subaccounts.length === 0 && <option value="">nenhuma subconta</option>}
          {subaccounts.map((s) => (
            <option key={s.id} value={s.id}>
              {(s.name ?? s.email ?? s.id) + (s.walletId ? ` · ${maskTail(s.walletId, 6)}` : "")}
            </option>
          ))}
        </select>
        <span className={styles.mono}>{activeLabel}</span>
      </div>

      <div className={styles.tabs}>
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={hrefFor(t.key)}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {actionError && <div className={styles.errorBanner}>{actionError}</div>}
      {data.error && <div className={styles.errorBanner}>{data.error}</div>}

      {tab === "subcontas" && (
        <SubaccountsTable
          rows={subaccounts}
          disabled={pending}
          onResend={(id) =>
            setConfirm({
              title: "Reenviar link de ativação",
              body: `Um novo link de ativação será enviado para a subconta ${id}.`,
              run: () => resendActivationLinkAction(id),
            })
          }
        />
      )}

      {tab === "tokens" && (
        <TokensTable
          rows={data.tokens}
          disabled={pending || !activeSub}
          onCreate={(name) =>
            setConfirm({
              title: "Criar chave de API interna",
              body: `Uma chave para \"${name}\" será criada no Asaas. O segredo ficará cifrado no proxy e não será exibido no navegador.`,
              run: () => createAccessTokenAction(activeSub!, name),
            })
          }
          onRevoke={(tokenId) =>
            setConfirm({
              title: "Revogar chave de API",
              body: `A chave ${maskTail(
                tokenId
              )} deixa de funcionar imediatamente. Integrações que a usam vão parar de autenticar.`,
              run: () => revokeAccessTokenAction(activeSub!, tokenId),
            })
          }
        />
      )}

      {tab === "split" && (
        <SplitTable
          rows={data.splitRules}
          disabled={pending || !activeSub}
          onToggle={(rule) => {
            const next = (rule.status ?? "").toUpperCase() === "ACTIVE" ? "INACTIVE" : "ACTIVE";
            setConfirm({
              title: next === "INACTIVE" ? "Desativar regra de split" : "Reativar regra de split",
              body:
                next === "INACTIVE"
                  ? "A regra para de repartir os próximos pagamentos. Ela não é apagada — pode ser reativada depois."
                  : "A regra volta a repartir os próximos pagamentos.",
              run: () => toggleSplitRuleAction(activeSub!, rule.id, next),
            });
          }}
        />
      )}

      {tab === "pagamentos" && (
        <PaymentsTable
          rows={data.payments}
          disabled={pending || !activeSub}
          onRefund={(p) =>
            setConfirm({
              title: "Reembolsar cobrança",
              body: `Reembolso de ${formatCurrency(String(p.value ?? 0))} para a cobrança ${p.id}. A operação é irreversível.`,
              run: () => refundPaymentAction(activeSub!, p.id),
            })
          }
          onCancel={(p) =>
            setConfirm({
              title: "Cancelar cobrança",
              body: `A cobrança ${p.id} (${formatCurrency(String(p.value ?? 0))}) é cancelada no Asaas. O cliente não conseguirá mais pagá-la.`,
              run: () => cancelPaymentAction(activeSub!, p.id),
            })
          }
        />
      )}

      {tab === "auditoria" && <AuditTable rows={data.auditLogs} />}

      <div className={styles.footer}>
        <span>dados vêm direto do Asaas via backend · nada é armazenado no navegador</span>
        <span>{subaccounts.length} subcontas cadastradas</span>
      </div>

      {confirm && (
        <div className={styles.overlay} role="dialog" aria-modal="true">
          <div className={styles.modal}>
            <h2 className={styles.modalTitle}>{confirm.title}</h2>
            <p className={styles.modalBody}>{confirm.body}</p>
            <div className={styles.modalActions}>
              <button type="button" className={styles.linkBtn} onClick={() => setConfirm(null)}>
                Voltar
              </button>
              <button type="button" className={styles.dangerBtn} onClick={runConfirmed}>
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className={styles.empty}>{text}</div>;
}

function SubaccountsTable({
  rows,
  disabled,
  onResend,
}: {
  rows: AsaasSubaccount[];
  disabled: boolean;
  onResend: (id: string) => void;
}) {
  const cols = "1.4fr 1fr .9fr .9fr .8fr";
  return (
    <div className={styles.panel}>
      <div className={styles.headRow} style={{ gridTemplateColumns: cols }}>
        <span>empresa</span>
        <span>wallet</span>
        <span>onboarding</span>
        <span>documento</span>
        <span />
      </div>
      {rows.length === 0 && <Empty text="Nenhuma subconta cadastrada ainda." />}
      {rows.map((s) => (
        <div key={s.id} className={styles.row} style={{ gridTemplateColumns: cols }}>
          <span style={{ fontWeight: 600 }}>{s.name ?? s.email ?? s.id}</span>
          <span className={styles.mono}>{maskTail(s.walletId, 6)}</span>
          <span
            className={`${styles.badge} ${
              (s.onboardingStatus ?? s.status ?? "").toUpperCase() === "APPROVED"
                ? styles.badgeGreen
                : styles.badgeAmber
            }`}
          >
            {s.onboardingStatus ?? s.status ?? "—"}
          </span>
          <span className={styles.mono}>{s.cpfCnpj ?? "—"}</span>
          <div className={styles.rowActions}>
            <button
              type="button"
              className={styles.linkBtn}
              disabled={disabled}
              onClick={() => onResend(s.id)}
            >
              reenviar ativação
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function TokensTable({
  rows,
  disabled,
  onCreate,
  onRevoke,
}: {
  rows: AsaasAccessToken[];
  disabled: boolean;
  onCreate: (name: string) => void;
  onRevoke: (tokenId: string) => void;
}) {
  const cols = "1.2fr 1.4fr .9fr .8fr";
  const [name, setName] = useState("");
  return (
    <div className={styles.panel}>
      <div className={styles.rowActions} style={{ marginBottom: 14 }}>
        <input
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="nome da integração interna"
          aria-label="nome da nova chave de API"
          disabled={disabled}
        />
        <button
          type="button"
          className={styles.linkBtn}
          disabled={disabled || !name.trim()}
          onClick={() => {
            onCreate(name.trim());
            setName("");
          }}
        >
          criar chave interna
        </button>
      </div>
      <div className={styles.headRow} style={{ gridTemplateColumns: cols }}>
        <span>nome</span>
        <span>chave</span>
        <span>status</span>
        <span />
      </div>
      {rows.length === 0 && <Empty text="Nenhuma chave de API nesta subconta." />}
      {rows.map((t) => (
        <div key={t.id} className={styles.row} style={{ gridTemplateColumns: cols }}>
          <span>{t.name ?? "—"}</span>
          {/* t.apiKey already arrives masked from listAccessTokens() (server-side) --
              see docs/prompts/nao-vazar-apikey-asaas-client.md. Only fall back to
              masking t.id here, never re-mask apiKey. */}
          <span className={styles.mono}>{t.apiKey ?? maskTail(t.id, 6)}</span>
          <span className={styles.badge}>{t.status ?? "ativa"}</span>
          <div className={styles.rowActions}>
            <button
              type="button"
              className={styles.dangerBtn}
              disabled={disabled}
              onClick={() => onRevoke(t.id)}
            >
              revogar
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function SplitTable({
  rows,
  disabled,
  onToggle,
}: {
  rows: AsaasSplitRule[];
  disabled: boolean;
  onToggle: (rule: AsaasSplitRule) => void;
}) {
  const cols = "1.4fr .8fr .8fr .8fr";
  return (
    <div className={styles.panel}>
      <div className={styles.headRow} style={{ gridTemplateColumns: cols }}>
        <span>wallet</span>
        <span>tipo</span>
        <span>valor</span>
        <span />
      </div>
      {rows.length === 0 && <Empty text="Nenhuma regra de split nesta subconta." />}
      {rows.map((r) => {
        const isPercent = r.percentualValue != null;
        const active = (r.status ?? "").toUpperCase() === "ACTIVE";
        return (
          <div key={r.id} className={styles.row} style={{ gridTemplateColumns: cols }}>
            <span className={styles.mono}>{maskTail(r.walletId, 6)}</span>
            <span>{isPercent ? "PERCENTAGE" : "FIXED"}</span>
            <span>{isPercent ? `${r.percentualValue}%` : formatCurrency(String(r.fixedValue ?? 0))}</span>
            <div className={styles.rowActions}>
              <span className={`${styles.badge} ${active ? styles.badgeGreen : ""}`}>
                {active ? "ativa" : "inativa"}
              </span>
              <button
                type="button"
                className={styles.linkBtn}
                disabled={disabled}
                onClick={() => onToggle(r)}
              >
                {active ? "desativar" : "reativar"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PaymentsTable({
  rows,
  disabled,
  onRefund,
  onCancel,
}: {
  rows: AsaasPayment[];
  disabled: boolean;
  onRefund: (p: AsaasPayment) => void;
  onCancel: (p: AsaasPayment) => void;
}) {
  const cols = "1fr .8fr .8fr .8fr 1.1fr";
  return (
    <div className={styles.panel}>
      <div className={styles.headRow} style={{ gridTemplateColumns: cols }}>
        <span>cobrança</span>
        <span>valor</span>
        <span>tipo</span>
        <span>status</span>
        <span />
      </div>
      {rows.length === 0 && <Empty text="Nenhuma cobrança nesta subconta." />}
      {rows.map((p) => {
        const status = (p.status ?? "").toUpperCase();
        const done = status === "RECEIVED" || status === "CONFIRMED";
        const refunded = status.includes("REFUND");
        return (
          <div key={p.id} className={styles.row} style={{ gridTemplateColumns: cols }}>
            <span className={styles.mono}>{p.id}</span>
            <span>{formatCurrency(String(p.value ?? 0))}</span>
            <span className={styles.mono}>{p.billingType ?? "—"}</span>
            <span
              className={`${styles.badge} ${
                done ? styles.badgeGreen : refunded ? styles.badgePink : styles.badgeAmber
              }`}
            >
              {p.status ?? "—"}
            </span>
            <div className={styles.rowActions}>
              <button
                type="button"
                className={styles.linkBtn}
                disabled={disabled || refunded}
                onClick={() => onRefund(p)}
              >
                reembolsar
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                disabled={disabled || done}
                onClick={() => onCancel(p)}
              >
                cancelar
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AuditTable({ rows }: { rows: AsaasAuditLog[] }) {
  const cols = "1fr 1.2fr 1fr 1fr";
  return (
    <div className={styles.panel}>
      <div className={styles.headRow} style={{ gridTemplateColumns: cols }}>
        <span>quando</span>
        <span>ação</span>
        <span>autor</span>
        <span>cliente</span>
      </div>
      {rows.length === 0 && <Empty text="Sem registros de auditoria no período." />}
      {rows.map((log, i) => (
        <div key={log.id ?? i} className={styles.row} style={{ gridTemplateColumns: cols }}>
          <span className={styles.mono}>
            {log.created_at ? formatDateTime(log.created_at) : "—"}
          </span>
          <span>{log.action ?? "—"}</span>
          <span className={styles.mono}>{log.actor ?? "—"}</span>
          <span className={styles.mono}>{log.client_id ?? "—"}</span>
        </div>
      ))}
    </div>
  );
}
