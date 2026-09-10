"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Logomark from "@/components/icons/Logomark";
import styles from "./PortalShell.module.scss";

const NAV_ITEMS = [
  { label: "Visão geral", href: "/portal" },
  { label: "Meus projetos", href: "/portal/projetos" },
  { label: "Orçamentos", href: "/portal/orcamentos" },
  { label: "Faturas", href: "/portal/faturas" },
  { label: "Recebimentos", href: "/portal/recebimentos" },
  { label: "Meu negócio", href: "/portal/negocio" },
  { label: "Meus dados", href: "/portal/dados" },
];

const RECEBIMENTOS_HREF = "/portal/recebimentos";

function LockIcon() {
  return (
    <svg width="9" height="11" viewBox="0 0 10 12" fill="none" aria-hidden="true">
      <rect x="1" y="5" width="8" height="6.4" rx="1.4" fill="currentColor" />
      <path d="M2.7 5V3.4a2.3 2.3 0 0 1 4.6 0V5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export default function PortalShell({
  accountName,
  businessName,
  onboardingRequired = false,
  children,
}: {
  accountName: string;
  businessName: string | null;
  onboardingRequired?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = accountName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Logomark width={22} height={26} />
          <span className={styles.wordmark}>DevButter</span>
          <span className={styles.pill}>minha conta</span>
        </div>
        <div className={styles.topbarActions}>
          <span className={styles.sessionStatus}>
            <span className={styles.sessionDot} aria-hidden="true" />
            sessão ativa
          </span>
          <div className={styles.identity}>
            <span className={styles.identityName}>
              {businessName ?? accountName} · {accountName}
            </span>
            <div className={styles.avatar}>{initial}</div>
          </div>
          <form className={styles.logoutForm} action="/api/portal/auth/logout" method="post">
            <button type="submit">sair</button>
          </form>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Navegação da conta">
          {NAV_ITEMS.map((item) => {
            const locked = onboardingRequired && item.href !== RECEBIMENTOS_HREF;
            const active =
              item.href === "/portal" ? pathname === item.href : pathname.startsWith(item.href);

            if (locked) {
              return (
                <span
                  key={item.href}
                  className={`${styles.navItem} ${styles.navItemLocked}`}
                  aria-disabled="true"
                  title="Disponível após a verificação da conta de recebimentos"
                >
                  {item.label}
                  <LockIcon />
                </span>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
