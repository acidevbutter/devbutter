import Link from "next/link";
import { getMindDashboardData } from "@/lib/admin/services/mind";
import { listSubaccounts, unwrapList } from "@/lib/admin/services/asaas";
import styles from "./Config.module.scss";

type IntegrationStatus = {
  tone: "ok" | "warn" | "error" | "idle";
  label: string;
  meta: string;
};

async function probeAsaas(): Promise<IntegrationStatus> {
  try {
    const page = await listSubaccounts({ limit: 1 });
    const count = page.totalCount ?? unwrapList(page).length;
    return {
      tone: "ok",
      label: "configurado · sandbox",
      meta: `${count} subconta${count === 1 ? "" : "s"} · verificado agora`,
    };
  } catch {
    return {
      tone: "error",
      label: "erro de conexão",
      meta: "não foi possível falar com o Asaas pelo backend",
    };
  }
}

async function probeMind(): Promise<IntegrationStatus> {
  try {
    const { overview } = await getMindDashboardData();
    return {
      tone: "ok",
      label: "configurado",
      meta: `${overview.knowledge_sources} fontes na base · API privada respondendo`,
    };
  } catch {
    return {
      tone: "error",
      label: "erro de conexão",
      meta: "a API privada do butter_mind não respondeu",
    };
  }
}

const RELAY_STATUS: IntegrationStatus = {
  tone: "warn",
  label: "ação necessária",
  meta: "sem rota admin exposta — operado pelo painel interno do Relay",
};

const dotClass: Record<IntegrationStatus["tone"], string> = {
  ok: styles.dotOk,
  warn: styles.dotWarn,
  error: styles.dotError,
  idle: styles.dotIdle,
};

const textClass: Record<IntegrationStatus["tone"], string> = {
  ok: styles.statusTextOk,
  warn: styles.statusTextWarn,
  error: styles.statusTextError,
  idle: styles.statusTextIdle,
};

export default async function AdminConfigHubPage() {
  const [asaas, mind] = await Promise.all([probeAsaas(), probeMind()]);

  const cards: Array<{
    category: string;
    name: string;
    href: string;
    status: IntegrationStatus;
  }> = [
    { category: "pagamentos", name: "Asaas", href: "/admin/config/asaas", status: asaas },
    { category: "e-mail", name: "Butter Relay", href: "/admin/config/relay", status: RELAY_STATUS },
    { category: "inteligência", name: "Butter Mind", href: "/admin/mind", status: mind },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.subheader}>
        <span>Configurações da plataforma</span>
        <span style={{ color: "var(--admin-text-2)" }}>restrito · admin</span>
      </div>

      <h1 className={styles.title}>Configurações da plataforma</h1>

      <p className={styles.notice}>
        Credenciais e configurações sensíveis são server-side. O navegador nunca fala com Asaas,
        Relay ou Mind diretamente.
      </p>

      <div className={styles.grid}>
        {cards.map((card, i) => (
          <div className={styles.card} key={card.name} style={{ animationDelay: `${i * 50}ms` }}>
            <div className={styles.cardCategory}>{card.category}</div>
            <div className={styles.cardName}>{card.name}</div>
            <div className={styles.statusRow}>
              <span className={`${styles.dot} ${dotClass[card.status.tone]}`} />
              <span className={`${styles.statusText} ${textClass[card.status.tone]}`}>
                {card.status.label}
              </span>
            </div>
            <p className={styles.cardMeta}>{card.status.meta}</p>
            <Link
              href={card.href}
              className={`${styles.cta} ${card.status.tone === "ok" ? styles.ctaOk : ""}`}
            >
              Abrir configurações
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
