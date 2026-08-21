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
  { label: "Meu negócio", href: "/portal/negocio" },
  { label: "Meus dados", href: "/portal/dados" },
];

export default function PortalShell({
  accountName,
  businessName,
  children,
}: {
  accountName: string;
  businessName: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const initial = accountName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.brand}>
          <Logomark width={18} height={21} />
          <span className={styles.wordmark}>DevButter</span>
          <span className={styles.pill}>minha conta</span>
        </div>
        <div className={styles.topbarActions}>
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
            const active =
              item.href === "/portal" ? pathname === item.href : pathname.startsWith(item.href);
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
