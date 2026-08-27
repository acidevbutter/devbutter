import Button from "@/components/admin/ui/Button/Button";
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
      label: "conectado",
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
      label: "conectado",
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
  tone: "idle",
  label: "não conectada ao painel",
  meta: "configuração pelo admin entra em fase futura — hoje o Relay é operado pelo painel interno dele",
};

const badgeClass: Record<IntegrationStatus["tone"], string> = {
  ok: styles.badgeOk,
  warn: styles.badgeWarn,
  error: styles.badgeError,
  idle: styles.badgeIdle,
};

export default async function AdminConfigHubPage() {
  const [asaas, mind] = await Promise.all([probeAsaas(), probeMind()]);

  const cards: Array<{ name: string; href: string; status: IntegrationStatus; cta: string }> = [
    { name: "Asaas", href: "/admin/config/asaas", status: asaas, cta: "Abrir configurações" },
    { name: "Butter Relay", href: "/admin/config/relay", status: RELAY_STATUS, cta: "Ver integração" },
    { name: "Butter Mind", href: "/admin/mind", status: mind, cta: "Abrir IA & Métricas" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1 className={styles.title}>Configurações da plataforma</h1>
          <p className={styles.subtitle}>Asaas, Butter Relay e Butter Mind</p>
        </div>
        <span className={styles.privatePill}>restrito · admin</span>
      </div>

      <p className={styles.notice}>
        Credenciais, certificados e tokens são server-side e nunca aparecem aqui em texto puro. O
        navegador nunca fala direto com Asaas, Relay ou Mind — tudo passa pelo backend.
      </p>

      <div className={styles.grid}>
        {cards.map((card) => (
          <div className={styles.card} key={card.name}>
            <div className={styles.cardHead}>
              <span className={styles.cardName}>{card.name}</span>
              <span className={`${styles.badge} ${badgeClass[card.status.tone]}`}>
                {card.status.label}
              </span>
            </div>
            <p className={styles.cardMeta}>{card.status.meta}</p>
            <Button href={card.href} variant="outline">
              {card.cta}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
