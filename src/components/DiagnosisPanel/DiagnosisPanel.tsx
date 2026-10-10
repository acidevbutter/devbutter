"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useDiagnosisConversation from "@/components/portal/NewQuoteModal/useDiagnosisConversation";
import type { DraftQuoteResult, NextStep, ProductOption } from "@/components/portal/NewQuoteModal/types";
import { CONCIERGE_GREETING, CONCIERGE_INTENTS } from "@/components/ConciergeCta/copy";
import styles from "./DiagnosisPanel.module.scss";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Labels of the collecting-step fields, keyed as butter_mind names them. */
const PROFILE_FIELD_LABELS: Record<string, string> = {
  business_name: "nome da empresa",
  segment: "segmento",
  city: "cidade / UF",
  volume: "volume",
  contact_name: "seu nome",
  contact_email: "e-mail",
  contact_phone: "whatsapp",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export type DiagnosisPanelProps = {
  onClose: () => void;
  /** Toast shown by the site after the panel closes ("Resumo enviado"). */
  onNotify?: (title: string, meta: string) => void;
};

/**
 * The public diagnosis chat ("Site DevButter.dc.html" › chat panel), on top of
 * the real conversation (`useDiagnosisConversation`: Socket.IO streaming,
 * next_step pills, option cards, collecting form, draft-quote). Only scope and
 * prazo are ever shown — no price before approval (#66).
 */
export default function DiagnosisPanel({ onClose, onNotify }: DiagnosisPanelProps) {
  const router = useRouter();
  const titleId = useId();
  const chat = useDiagnosisConversation({ initialMessage: CONCIERGE_GREETING });
  const {
    hydrated,
    messages,
    preview,
    readyToSubmit,
    sending,
    confirming,
    confirmedQuote,
    error,
    setError,
  } = chat;

  const [draft, setDraft] = useState("");
  const [checked, setChecked] = useState<string[]>([]);
  const [writeInstead, setWriteInstead] = useState(false);
  const [collecting, setCollecting] = useState<Record<string, string>>({});
  const [skipCollecting, setSkipCollecting] = useState(false);
  const [contact, setContact] = useState({ name: "", email: "", phone: "", company: "" });
  const [consent, setConsent] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);
  const [keepTalking, setKeepTalking] = useState(false);

  const dialogRef = useRef<HTMLElement | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  // Esc closes and keeps the conversation (it resumes from the cookie).
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keep the newest bubble in view while streaming.
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending, preview, readyToSubmit, confirmedQuote]);

  // Focus lands in the dialog as soon as it opens.
  useEffect(() => {
    const t = window.setTimeout(() => {
      (composerRef.current ?? dialogRef.current)?.focus();
    }, 60);
    return () => window.clearTimeout(t);
  }, []);

  const step = preview?.next_step ?? null;
  const stage = preview?.stage;
  const options = preview?.options ?? [];
  const missing = preview?.missing_fields ?? [];
  const lastMessage = messages[messages.length - 1];
  const streaming = sending && lastMessage?.role === "ai" && lastMessage.content !== "";
  const waiting = sending && lastMessage?.role === "ai" && lastMessage.content === "";

  const showIntents =
    !step && !sending && messages.length === 1 && messages[0].role === "ai" && hydrated;
  const showStepChips = !!step && step.options.length >= 2 && !sending && !readyToSubmit;
  const showOptionCards = stage === "choosing" && options.length >= 2 && !sending && !readyToSubmit;
  const showCollecting =
    stage === "collecting" && missing.length > 0 && !skipCollecting && !sending && !readyToSubmit;
  const showContact = readyToSubmit && !confirmedQuote && !keepTalking;
  const optionsUp = showStepChips || showOptionCards || showCollecting;
  const composerOff = !hydrated || sending || showContact || !!confirmedQuote || (optionsUp && !writeInstead);

  const placeholder = !hydrated
    ? "Aguarde…"
    : showContact || confirmedQuote
      ? "Conversa encerrada"
      : optionsUp && !writeInstead
        ? "Escolha uma opção acima"
        : step
          ? "…ou escreva a sua resposta"
          : "Escreva do seu jeito…";

  function resetTurnUi() {
    setChecked([]);
    setWriteInstead(false);
    setKeepTalking(false);
  }

  async function sendText(text: string) {
    if (!text.trim()) return;
    resetTurnUi();
    setDraft("");
    const el = composerRef.current;
    if (el) el.style.height = "";
    await chat.send(text);
  }

  async function pickStep(s: NextStep, ids: string[]) {
    resetTurnUi();
    await chat.sendOption(s, ids);
  }

  async function pickOption(o: ProductOption) {
    resetTurnUi();
    setSkipCollecting(false);
    await chat.selectOption(o);
  }

  async function saveCollecting() {
    setWriteInstead(false);
    if (await chat.submitBusinessProfile(collecting)) setCollecting({});
  }

  function onComposerKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendText(draft);
    }
  }

  // Simple focus trap: Tab cycles inside the dialog (aria-modal).
  function onDialogKey(e: KeyboardEvent<HTMLElement>) {
    if (e.key !== "Tab" || !dialogRef.current) return;
    const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  const detectedCompany = preview?.business_profile?.is_legal_entity === true;

  async function submitContact(e: FormEvent) {
    e.preventDefault();
    if (!EMAIL_RE.test(contact.email.trim())) {
      setContactError("Precisamos de um e-mail válido pra mandar o resumo.");
      return;
    }
    if (!contact.name.trim()) {
      setContactError("Diz como a gente te chama pra montar o resumo.");
      return;
    }
    if (!consent) {
      setContactError("Confirme a autorização de contato pra enviar o resumo.");
      return;
    }
    setContactError(null);
    setError(null);
    await chat.confirm({
      email: contact.email.trim(),
      phone: contact.phone.trim() || undefined,
      contact_name: contact.name.trim(),
      ...(detectedCompany && contact.company.trim() ? { contact_company: contact.company.trim() } : {}),
    });
  }

  function followInAccount() {
    onClose();
    router.push("/portal/orcamentos");
    router.refresh();
  }

  function emailOnly() {
    onClose();
    onNotify?.("Resumo enviado", "um engenheiro revisa e responde por e-mail");
  }

  const chosen = options.find((o) => o.key === preview?.selected_option_key);
  const summaryTitle = chosen?.title || preview?.problem_summary?.trim() || "Seu diagnóstico";
  const summaryDesc = chosen?.summary || (preview?.solution_kinds?.length ? preview.solution_kinds.join(" · ") : null);
  const noteFirstUser = messages.findIndex((m) => m.role === "me");

  const panel = (
    <>
      <div className={styles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside
        ref={dialogRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onDialogKey}
      >
        <header className={styles.head}>
          <div className={styles.headMeta}>
            <span className={styles.liveDot} aria-hidden="true" />
            <div>
              <div id={titleId} className={styles.headTitle}>
                Time DevButter
              </div>
              <div className={styles.headSub}>IA assistida · revisado por engenheiro</div>
            </div>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar conversa">
            esc ✕
          </button>
        </header>

        <div ref={logRef} className={styles.log} aria-live="polite" aria-busy={sending}>
          {messages.map((m, i) => {
            if (m.content === "") return null;
            const isLast = i === messages.length - 1;
            if (m.role === "ai") {
              return (
                <div key={i} className={styles.ai}>
                  {m.content}
                  {isLast && streaming && (
                    <span className={styles.caret} aria-hidden="true">
                      ▍
                    </span>
                  )}
                </div>
              );
            }
            return (
              <div key={i} className={styles.meRow}>
                {m.status === "failed" ? (
                  <button
                    type="button"
                    className={styles.retry}
                    onClick={() => chat.retry(i)}
                    disabled={sending}
                  >
                    ↻ tentar de novo
                  </button>
                ) : null}
                <div className={`${styles.me} ${m.status === "failed" ? styles.meFailed : ""}`}>{m.content}</div>
                {i === noteFirstUser && m.status !== "failed" && preview?.problem_summary && (
                  <div className={styles.pill}>✓ problema anotado no resumo</div>
                )}
              </div>
            );
          })}

          {waiting && (
            <div className={styles.typing} role="status">
              <span className={styles.dots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className={styles.typingLabel}>{stage === "qualifying" ? "" : "montando seu escopo…"}</span>
              <span className="sr-only">O time está escrevendo</span>
            </div>
          )}

          {showOptionCards && (
            <div className={styles.options} role="group" aria-label="Caminhos propostos">
              {options.map((o, idx) => (
                <button
                  key={o.key}
                  type="button"
                  className={styles.option}
                  style={{ animationDelay: `${idx * 80}ms` }}
                  onClick={() => pickOption(o)}
                >
                  <span className={styles.optionTitle}>
                    {o.title}
                    {o.recommended && <span className={styles.badge}>recomendado</span>}
                  </span>
                  <span className={styles.optionDesc}>{o.summary}</span>
                  {o.timeline && <span className={styles.optionTime}>{o.timeline}</span>}
                </button>
              ))}
              <div className={styles.note}>estimativa da IA · um engenheiro revisa antes de virar proposta</div>
            </div>
          )}

          {showCollecting && (
            <form
              className={styles.card}
              onSubmit={(e) => {
                e.preventDefault();
                void saveCollecting();
              }}
            >
              <div className={styles.cardHint}>Só falta confirmar:</div>
              {missing.map((field) => (
                <label key={field} className={styles.field}>
                  <span className={styles.label}>{PROFILE_FIELD_LABELS[field] ?? field}</span>
                  <input
                    className={styles.input}
                    type={field === "contact_email" ? "email" : field === "contact_phone" ? "tel" : "text"}
                    value={collecting[field] ?? ""}
                    onChange={(e) => setCollecting((cur) => ({ ...cur, [field]: e.target.value }))}
                  />
                </label>
              ))}
              <div className={styles.actions}>
                <button
                  type="submit"
                  className={styles.solid}
                  disabled={Object.values(collecting).every((v) => !v?.trim())}
                >
                  Confirmar dados
                </button>
                <button type="button" className={styles.textBtn} onClick={() => setSkipCollecting(true)}>
                  pular por agora
                </button>
              </div>
            </form>
          )}

          {showContact && (
            <form className={styles.card} onSubmit={submitContact} noValidate>
              <div className={styles.summary}>
                <span className={styles.label}>resumo · rascunho</span>
                <div className={styles.summaryTitle}>{summaryTitle}</div>
                {summaryDesc && <div className={styles.summaryDesc}>{summaryDesc}</div>}
                <div className={styles.summaryMeta}>prazo estimado · {preview?.timeline || "a estimar"}</div>
              </div>
              <label className={styles.field}>
                <span className={styles.label}>seu nome</span>
                <input
                  className={styles.input}
                  autoComplete="name"
                  value={contact.name}
                  onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>e-mail</span>
                <input
                  className={styles.input}
                  type="email"
                  autoComplete="email"
                  placeholder="voce@empresa.com.br"
                  value={contact.email}
                  aria-invalid={contactError?.includes("e-mail") ? true : undefined}
                  onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>whatsapp · opcional</span>
                <input
                  className={styles.input}
                  type="tel"
                  autoComplete="tel"
                  placeholder="(11) 9…"
                  value={contact.phone}
                  onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))}
                />
              </label>
              {detectedCompany && (
                <label className={styles.field}>
                  <span className={styles.label}>empresa · opcional</span>
                  <input
                    className={styles.input}
                    autoComplete="organization"
                    placeholder={preview?.business_profile?.company_name ?? "nome da empresa"}
                    value={contact.company}
                    onChange={(e) => setContact((c) => ({ ...c, company: e.target.value }))}
                  />
                </label>
              )}
              <label className={styles.consent}>
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
                <span>Autorizo a DevButter a me contatar sobre este diagnóstico. Posso apagar meus dados quando quiser.</span>
              </label>
              {contactError && (
                <div className={styles.error} role="alert">
                  {contactError}
                </div>
              )}
              <div className={styles.actions}>
                <button type="submit" className={styles.solid} disabled={confirming}>
                  {confirming ? "Enviando…" : "Enviar resumo"}
                </button>
                <button type="button" className={styles.textBtn} onClick={() => setKeepTalking(true)}>
                  continuar conversando
                </button>
              </div>
            </form>
          )}

          {confirmedQuote && (
            <Finish
              quote={confirmedQuote}
              email={contact.email.trim()}
              onFollow={followInAccount}
              onEmailOnly={emailOnly}
              onClose={onClose}
            />
          )}

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}
        </div>

        {(showIntents || showStepChips) && (
          <div className={styles.chips} role="group" aria-label={step?.prompt ?? "Sugestões para começar"}>
            {showIntents &&
              CONCIERGE_INTENTS.map((label) => (
                <button key={label} type="button" className={styles.chip} onClick={() => sendText(label)}>
                  {label}
                </button>
              ))}
            {showStepChips && step && step.selection_mode === "single" &&
              step.options.map((o) => (
                <button key={o.id} type="button" className={styles.chip} onClick={() => pickStep(step, [o.id])}>
                  {o.label}
                </button>
              ))}
            {showStepChips && step && step.selection_mode === "multi" && (
              <>
                {step.options.map((o) => {
                  const on = checked.includes(o.id);
                  return (
                    <button
                      key={o.id}
                      type="button"
                      className={`${styles.chip} ${on ? styles.chipOn : ""}`}
                      aria-pressed={on}
                      onClick={() => setChecked((cur) => (on ? cur.filter((id) => id !== o.id) : [...cur, o.id]))}
                    >
                      {on ? "✓ " : ""}
                      {o.label}
                    </button>
                  );
                })}
                <button
                  type="button"
                  className={styles.chipConfirm}
                  disabled={checked.length === 0}
                  onClick={() => pickStep(step, checked)}
                >
                  Confirmar seleção
                </button>
              </>
            )}
          </div>
        )}

        <div className={styles.composer}>
          {optionsUp && !writeInstead && step?.allow_free_text !== false && (
            <button type="button" className={styles.writeInstead} onClick={() => setWriteInstead(true)}>
              escrever resposta
            </button>
          )}
          <div className={styles.composerRow}>
            <label className="sr-only" htmlFor={`${titleId}-composer`}>
              Sua mensagem
            </label>
            <textarea
              id={`${titleId}-composer`}
              ref={composerRef}
              rows={1}
              className={styles.input}
              value={draft}
              placeholder={placeholder}
              disabled={composerOff}
              onChange={(e) => {
                setDraft(e.target.value);
                e.target.style.height = "auto";
                e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
              }}
              onKeyDown={onComposerKey}
            />
            <button
              type="button"
              className={styles.send}
              data-ready={draft.trim() && !composerOff ? "" : undefined}
              onClick={() => sendText(draft)}
              disabled={composerOff || !draft.trim()}
              aria-label="Enviar"
            >
              ↑
            </button>
          </div>
        </div>
      </aside>
    </>
  );

  return typeof document === "undefined" ? null : createPortal(panel, document.body);
}

/** After draft-quote: the three account outcomes the backend can return. */
function Finish({
  quote,
  email,
  onFollow,
  onEmailOnly,
  onClose,
}: {
  quote: DraftQuoteResult;
  email: string;
  onFollow: () => void;
  onEmailOnly: () => void;
  onClose: () => void;
}) {
  // E-mail already belongs to an account: no automatic login (account-takeover
  // guard, docs/plano-onboarding-conversa-primeiro.md §3) — the owner is notified.
  if (quote.pending_account_link) {
    return (
      <>
        <div className={styles.ai}>
          Pedido {quote.reference} registrado. Esse e-mail já tem conta com a gente — por segurança, não
          entramos nela por aqui. Avisamos o dono do e-mail pra confirmar o pedido.
        </div>
        <div className={styles.finish}>
          <Link href="/entrar?next=/portal/orcamentos" className={styles.solid} onClick={onClose}>
            É meu — entrar na conta
          </Link>
          <button type="button" className={styles.outline} onClick={onClose}>
            Fechar
          </button>
        </div>
      </>
    );
  }

  // New account created on the spot and logged in (cookies set by the BFF).
  if (quote.tokens) {
    return (
      <>
        <div className={styles.ai}>
          Resumo enviado{email ? ` para ${email}` : ""} · pedido {quote.reference}. Quer acompanhar orçamento,
          projeto e faturas num lugar só?
        </div>
        <div className={styles.finish}>
          <button type="button" className={styles.solid} onClick={onFollow}>
            Criar conta e acompanhar
          </button>
          <button type="button" className={styles.outline} onClick={onEmailOnly}>
            Só por e-mail
          </button>
        </div>
        <div className={styles.note}>
          sua conta já fica criada com este e-mail — mandamos um link pra você definir a senha.
        </div>
      </>
    );
  }

  // Already a logged-in client.
  return (
    <>
      <div className={styles.ai}>
        Resumo enviado · pedido {quote.reference}. Um engenheiro revisa e responde por e-mail.
      </div>
      <div className={styles.finish}>
        <button type="button" className={styles.solid} onClick={onFollow}>
          Ver meus orçamentos
        </button>
        <button type="button" className={styles.outline} onClick={onEmailOnly}>
          Fechar
        </button>
      </div>
    </>
  );
}
