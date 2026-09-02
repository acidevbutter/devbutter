import Link from "next/link";
import styles from "./RelayConfig.module.scss";

const EVENTS = [
  "novo lead recebido",
  "confirmação de cadastro",
  "orçamento aprovado",
  "invoice criada",
  "falha de pagamento",
  "webhook Asaas recebido",
];

const TEMPLATES = [
  { name: "Boas-vindas ao cliente", event: "confirmação de cadastro" },
  { name: "Seu orçamento foi aprovado", event: "orçamento aprovado" },
  { name: "Nova fatura disponível", event: "invoice criada" },
  { name: "Pagamento não confirmado", event: "falha de pagamento" },
];

export default function AdminRelayConfigPage() {
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/admin/config">Configurações</Link> / Butter Relay
      </div>

      <div className={styles.header}>
        <h1 className={styles.title}>Configurações · Butter Relay</h1>
        <span className={styles.statusBadge}>não conectada ao painel</span>
      </div>

      <div className={styles.blockedBanner}>
        <span className={styles.blockedTitle}>Integração não conectada ao painel</span>
        <span className={styles.blockedBody}>
          O backend ainda não expõe rotas admin para o Butter Relay — hoje ele publica em fila e não
          é consultado pela API. O Relay tem um painel interno próprio para operação; a configuração
          por aqui entra numa fase futura. O layout abaixo é a especificação do produto e fica inerte
          até as rotas existirem (ver <code>docs/prompts/butter-relay-admin-connection.md</code>).
        </span>
      </div>

      <div className={styles.preview} aria-hidden="true">
        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Conexão</h2>
            <button type="button" className={styles.testBtn}>
              Enviar teste
            </button>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.rowLine}>
              <span>remetente padrão</span>
              <span>—</span>
            </div>
            <div className={styles.rowLine}>
              <span>ambiente ativo</span>
              <span>—</span>
            </div>
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Eventos habilitados</h2>
          </div>
          <div className={styles.panelBody}>
            {EVENTS.map((label, i) => (
              <div className={styles.toggleRow} key={label}>
                <span>{label}</span>
                <span
                  className={`${styles.switch} ${
                    i < EVENTS.length - 2 ? styles.switchOn : ""
                  }`}
                />
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Templates de e-mail</h2>
          </div>
          <div className={styles.panelBody}>
            {TEMPLATES.map((t) => (
              <div className={styles.rowLine} key={t.name}>
                <span>{t.name}</span>
                <span>{t.event}</span>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.panel}>
          <div className={styles.panelHeader}>
            <h2>Fila de envio</h2>
          </div>
          <div className={styles.panelBody}>
            <div className={styles.counters}>
              <div className={styles.counter}>
                <span>enviadas</span>
                <strong>—</strong>
              </div>
              <div className={styles.counter}>
                <span>pendentes</span>
                <strong>—</strong>
              </div>
              <div className={styles.counter}>
                <span>falhadas</span>
                <strong>—</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
