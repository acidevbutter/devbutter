"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import Logomark from "@/components/icons/Logomark";
import styles from "./AdminShell.module.scss";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/admin/dashboard" },
  { label: "Quotes", href: "/admin/quotes", badgeKey: "quotes" as const },
  { label: "Clientes", href: "/admin/clients" },
  { label: "Empresas", href: "/admin/companies" },
  { label: "Orders", href: "/admin/orders" },
  { label: "Invoices", href: "/admin/invoices" },
  { divider: true as const },
  { label: "Catálogo", href: "/admin/catalog" },
  { label: "Conhecimento", href: "/admin/knowledge" },
  { label: "Conversas", href: "/admin/conversations" },
  { label: "Webhooks", href: "/admin/webhooks" },
];

export default function AdminShell({
  accountName,
  pendingQuotesCount,
  children,
}: {
  accountName: string;
  pendingQuotesCount: number;
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
          <span className={styles.pill}>admin</span>
        </div>
        <div className={styles.topbarActions}>
          <input className={styles.search} placeholder="buscar cliente, quote, order…" disabled />
          <div className={styles.identity}>
            <span className={styles.identityName}>{accountName}</span>
            <div className={styles.avatar}>{initial}</div>
          </div>
          <form className={styles.logoutForm} action="/api/admin/auth/logout" method="post">
            <button type="submit">sair</button>
          </form>
        </div>
      </header>

      <div className={styles.body}>
        <nav className={styles.sidebar} aria-label="Navegação do admin">
          {NAV_ITEMS.map((item, i) =>
            "divider" in item ? (
              <div key={`divider-${i}`} className={styles.navDivider} />
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${
                  pathname.startsWith(item.href) ? styles.navItemActive : ""
                }`}
              >
                {item.label}
                {item.badgeKey === "quotes" && pendingQuotesCount > 0 && (
                  <span className={styles.navBadge}>{pendingQuotesCount}</span>
                )}
              </Link>
            )
          )}
        </nav>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
