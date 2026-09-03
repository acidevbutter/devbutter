"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchAdmin, type AdminSearchItem, type AdminSearchResponse } from "@/lib/admin/search";
import styles from "./GlobalSearch.module.scss";

type Phase = "idle" | "loading" | "done" | "error";

export default function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<AdminSearchResponse>({ groups: [] });
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const flatItems = useMemo(() => data.groups.flatMap((g) => g.items), [data]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setData({ groups: [] });
    setPhase("idle");
    setCursor(0);
  }, []);

  // ⌘K / Ctrl+K opens from anywhere in the admin.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  // Debounced fan-out query. All state writes happen inside the timeout /
  // promise callbacks (never synchronously in the effect body).
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      if (q.length < 2) {
        setData({ groups: [] });
        setPhase("idle");
        return;
      }
      setPhase("loading");
      searchAdmin(q, controller.signal)
        .then((res) => {
          setData(res);
          setCursor(0);
          setPhase("done");
        })
        .catch((err) => {
          if (err?.name === "AbortError") return;
          setPhase("error");
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);

  function go(item: AdminSearchItem) {
    close();
    router.push(item.href);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, Math.max(flatItems.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && flatItems[cursor]) {
      e.preventDefault();
      go(flatItems[cursor]);
    }
  }

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        <SearchIcon />
        buscar cliente, quote, order…
        <span className={styles.triggerKey}>⌘K</span>
      </button>

      {open && (
        <div
          className={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Busca global">
            <div className={styles.inputRow}>
              <SearchIcon />
              <input
                ref={inputRef}
                className={styles.input}
                placeholder="buscar cliente, empresa, order, invoice, quote…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onInputKey}
              />
              <span className={styles.escKey}>esc</span>
            </div>

            {phase === "idle" && (
              <div className={styles.state}>digite ao menos 2 caracteres para buscar</div>
            )}
            {phase === "loading" && <div className={styles.state}>buscando…</div>}
            {phase === "error" && (
              <div className={styles.state}>não foi possível buscar agora — tente de novo</div>
            )}
            {phase === "done" && flatItems.length === 0 && (
              <div className={styles.state}>nenhum resultado para “{query.trim()}”</div>
            )}

            {phase === "done" && flatItems.length > 0 && (
              <div className={styles.results}>
                {data.groups.map((group) => (
                  <div key={group.group}>
                    <div className={styles.groupLabel}>{group.group}</div>
                    {group.items.map((item) => {
                      const idx = flatItems.indexOf(item);
                      return (
                        <a
                          key={item.href + item.label}
                          className={`${styles.item} ${idx === cursor ? styles.itemActive : ""}`}
                          href={item.href}
                          onMouseEnter={() => setCursor(idx)}
                          onClick={(e) => {
                            e.preventDefault();
                            go(item);
                          }}
                        >
                          <span className={styles.itemLabel}>{item.label}</span>
                          <span className={styles.itemSub}>{item.sub}</span>
                        </a>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            <div className={styles.footer}>
              <span>↑↓ navegar</span>
              <span>↵ abrir</span>
              <span>⌘K fechar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
