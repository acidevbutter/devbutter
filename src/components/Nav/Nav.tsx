"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logomark from "@/components/icons/Logomark";
import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import styles from "./Nav.module.scss";

export const SITE_LINKS = [
  { label: "Cases", href: "/cases" },
  { label: "Como trabalhamos", href: "/metodo" },
  { label: "Contato", href: "/contato" },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Nav() {
  const pathname = usePathname() ?? "/";
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPath, setMenuPath] = useState(pathname);
  const menuId = useId();

  // Navigating closes the mobile menu (state derived during render, not in an effect).
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className={styles.header}>
      <div className={styles.bar}>
        <Link href="/" className={styles.brand} aria-label="DevButter — início">
          <Logomark width={24} height={27} />
          <span className={styles.wordmark}>
            Dev<span className={styles.wordmarkAccent}>Butter</span>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="Navegação principal">
          {SITE_LINKS.map(({ label, href }) => (
            <Link
              key={href}
              href={href}
              className={styles.navLink}
              aria-current={isActive(pathname, href) ? "page" : undefined}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.actions}>
          <Link href="/entrar" className={styles.login}>
            Entrar
          </Link>
          <ConciergeCta className={styles.cta}>Solicitar diagnóstico</ConciergeCta>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls={menuId}
            aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className={styles.menuIcon} data-open={menuOpen || undefined} aria-hidden="true" />
          </button>
        </div>
      </div>

      <nav
        id={menuId}
        className={styles.mobileMenu}
        data-open={menuOpen || undefined}
        aria-label="Navegação principal (menu)"
        hidden={!menuOpen}
      >
        {SITE_LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={styles.mobileLink}
            aria-current={isActive(pathname, href) ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
        <Link href="/entrar" className={styles.mobileLink}>
          Entrar
        </Link>
      </nav>
    </header>
  );
}
