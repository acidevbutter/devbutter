"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import { PUBLIC_SOCKET_URL } from "@/lib/portal/config";
import styles from "./NewQuoteModal.module.scss";

type Message = { role: "ai" | "me"; content: string; status?: "sending" | "failed" };

type JoinAck = { ok: boolean; detail?: string };

type DraftQuoteResult = {
  quote_id: string;
  reference: string;
  scope_summary: string;
  price_range: string | null;
  timeline: string | null;
  tokens: unknown | null;
  pending_account_link: boolean;
};

type DiagnosisPreview = {
  problem_summary: string;
  services_of_interest: string[];
  budget_range: string | null;
  timeline: string | null;
  missing_information: string[];
  grounding_status: string;
};

type ConversationRead = {
  id: string;
  account_id: string | null;
  status: string;
  transcript: { role: string; content: string }[];
  ready_to_submit: boolean;
  draft_preview: DiagnosisPreview | null;
};

const INITIAL_AI_MESSAGE = "Oi! Vi que você já tem projetos com a gente. Me conta o que você precisa agora.";

const noopSubscribe = () => () => {};

function appendToLastAi(current: Message[], delta: string): Message[] {
  const lastIndex = current.length - 1;
  if (lastIndex < 0 || current[lastIndex].role !== "ai") return current;
  const next = [...current];
  next[lastIndex] = { ...next[lastIndex], content: next[lastIndex].content + delta };
  return next;
}

function dropTrailingEmptyAi(current: Message[]): Message[] {
  const lastIndex = current.length - 1;
  if (lastIndex >= 0 && current[lastIndex].role === "ai" && current[lastIndex].content === "") {
    return current.slice(0, lastIndex);
  }
  return current;
}

function setStatusAt(current: Message[], index: number, status: Message["status"]): Message[] {
  if (index < 0 || index >= current.length) return current;
  const next = [...current];
  next[index] = { ...next[index], status };
  return next;
}

function transcriptToMessages(transcript: { role: string; content: string }[]): Message[] {
  return transcript.map((m) => ({ role: m.role === "user" ? "me" : "ai", content: m.content }));
}

export default function NewQuoteModal({
  onClose,
  initialMessage = INITIAL_AI_MESSAGE,
  mode = "public",
}: {
  onClose: () => void;
  initialMessage?: string;
  /** "public": anonymous visitor -- shows the 1e contact/password step before
   * confirming. "portal": already-logged-in client -- skips straight to
   * confirm, matching canvas screen 1g ("sem passo de cadastro"). */
  mode?: "public" | "portal";
}) {
  const router = useRouter();
  // Rendered through a portal on <body> so an ancestor with backdrop-filter (the
  // sticky nav) can't become the containing block for the fixed-position overlay.
  // false during SSR / first paint, true once hydrated — safe for createPortal.
  const portalReady = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "ai", content: initialMessage }]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [preview, setPreview] = useState<DiagnosisPreview | null>(null);
  const [forceComposer, setForceComposer] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedQuote, setConfirmedQuote] = useState<DraftQuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPassword, setContactPassword] = useState("");
  const socketRef = useRef<Socket | null>(null);
  const joinedConversationsRef = useRef<Set<string>>(new Set());

  // Free-drag: the header acts as a grab handle and the card is offset from its
  // centered resting position by this translation.
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{
    px: number;
    py: number;
    ox: number;
    oy: number;
    layoutLeft: number;
    layoutTop: number;
    width: number;
  } | null>(null);

  function onHandlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    const card = e.currentTarget.parentElement;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    dragStartRef.current = {
      px: e.clientX,
      py: e.clientY,
      ox: dragOffset.x,
      oy: dragOffset.y,
      // Card position with the current offset backed out — i.e. where it sits at translate(0,0).
      layoutLeft: rect.left - dragOffset.x,
      layoutTop: rect.top - dragOffset.y,
      width: rect.width,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onHandlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const start = dragStartRef.current;
    if (!start) return;
    // Keep at least a strip of the card on screen so the header stays grabbable.
    const MARGIN = 12;
    const MIN_VISIBLE_X = 140;
    const HEADER_KEEP = 44;
    let x = start.ox + (e.clientX - start.px);
    let y = start.oy + (e.clientY - start.py);
    x = Math.min(
      Math.max(x, MARGIN - (start.width - MIN_VISIBLE_X) - start.layoutLeft),
      window.innerWidth - MIN_VISIBLE_X - start.layoutLeft
    );
    y = Math.min(
      Math.max(y, MARGIN - start.layoutTop),
      window.innerHeight - HEADER_KEEP - start.layoutTop
    );
    setDragOffset({ x, y });
  }

  function onHandlePointerUp(e: React.PointerEvent<HTMLDivElement>) {
    dragStartRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
  }

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  // Resume-or-start on open. If this browser has a resumable conversation we
  // rehydrate it; otherwise we create one right now so the first message goes
  // out against a real diagnosis session (deliver() still creates one lazily
  // as a fallback). The ref guards against React StrictMode's double-invoke
  // creating two conversations.
  const bootstrappedRef = useRef(false);
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;

    (async () => {
      try {
        const res = await fetch("/api/portal/conversations/current");
        const body: { conversation: ConversationRead | null } = res.ok
          ? await res.json()
          : { conversation: null };

        if (body.conversation) {
          setConversationId(body.conversation.id);
          const resumed = transcriptToMessages(body.conversation.transcript);
          setMessages(resumed.length ? resumed : [{ role: "ai", content: initialMessage }]);
          setReadyToSubmit(body.conversation.ready_to_submit);
          setPreview(body.conversation.draft_preview);
        } else {
          const created = await fetch("/api/portal/conversations", { method: "POST" });
          if (created.ok) {
            const conversation = (await created.json()) as { id: string };
            setConversationId(conversation.id);
          }
        }
      } catch {
        // Swallowed on purpose: deliver() creates a conversation lazily if we
        // couldn't here.
      } finally {
        setHydrated(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showContactStep = readyToSubmit && !forceComposer && mode === "public";
  const showReadyPanel = readyToSubmit && !forceComposer && mode === "portal";
  const showComposer = !readyToSubmit || forceComposer;
  const streamingEmpty = sending && messages[messages.length - 1]?.role === "ai" && messages[messages.length - 1]?.content === "";

  async function connectSocket(): Promise<Socket> {
    if (!socketRef.current) {
      socketRef.current = io(PUBLIC_SOCKET_URL, { withCredentials: true });
    }
    const socket = socketRef.current;
    if (socket.connected) return socket;
    await new Promise<void>((resolve, reject) => {
      socket.once("connect", () => resolve());
      socket.once("connect_error", (err) => reject(err instanceof Error ? err : new Error(String(err))));
    });
    return socket;
  }

  async function joinConversation(socket: Socket, id: string): Promise<void> {
    if (joinedConversationsRef.current.has(id)) return;
    const ack = await new Promise<JoinAck>((resolve) => {
      socket.emit("join_conversation", { conversation_id: id }, resolve);
    });
    if (!ack.ok) throw new Error(ack.detail ?? "Não foi possível entrar na conversa.");
    joinedConversationsRef.current.add(id);
  }

  function streamReply(
    socket: Socket,
    id: string,
    content: string
  ): Promise<{ ready_to_submit: boolean; preview: DiagnosisPreview | null }> {
    return new Promise((resolve, reject) => {
      function onChunk(payload: { content: string }) {
        setMessages((current) => appendToLastAi(current, payload.content));
      }
      function onDone(payload: {
        ready_to_submit: boolean;
        message_id: string;
        preview?: DiagnosisPreview | null;
      }) {
        cleanup();
        resolve({ ready_to_submit: payload.ready_to_submit, preview: payload.preview ?? null });
      }
      function onError(payload: { detail: string }) {
        cleanup();
        reject(new Error(payload.detail || "Não foi possível continuar a conversa."));
      }
      function cleanup() {
        socket.off("assistant_chunk", onChunk);
        socket.off("assistant_done", onDone);
        socket.off("assistant_error", onError);
      }
      socket.on("assistant_chunk", onChunk);
      socket.on("assistant_done", onDone);
      socket.on("assistant_error", onError);
      socket.emit("send_message", { conversation_id: id, content });
    });
  }

  /** Runs the network round-trip for the `me` message at `meIndex`. On failure the
   * message is left in the thread flagged `failed` (never re-appended) so the user
   * can retry it in place instead of typing it again. */
  async function deliver(content: string, meIndex: number) {
    setSending(true);
    setError(null);

    try {
      let activeConversationId = conversationId;
      console.log(conversationId, "atividade");
      if (!activeConversationId) {
        const conversationRes = await fetch("/api/portal/conversations", { method: "POST" });
        if (!conversationRes.ok) throw new Error("Não foi possível iniciar a conversa.");
        const conversation = (await conversationRes.json()) as { id: string };
        activeConversationId = conversation.id;
        console.log(activeConversationId);
        setConversationId(activeConversationId);
      }

      const socket = await connectSocket();
      await joinConversation(socket, activeConversationId);
      const result = await streamReply(socket, activeConversationId, content);
      setMessages((current) => setStatusAt(current, meIndex, undefined));
      setReadyToSubmit(result.ready_to_submit);
      setPreview(result.preview);
    } catch (err) {
      setMessages((current) => dropTrailingEmptyAi(setStatusAt(current, meIndex, "failed")));
      setError(err instanceof Error ? err.message : "Não foi possível continuar a conversa.");
    } finally {
      setSending(false);
    }
  }

  async function send() {
    const content = draft.trim();
    if (!content || sending || !hydrated) return;
    const meIndex = messages.length;
    setDraft("");
    setForceComposer(false);
    setMessages((current) => [
      ...current,
      { role: "me", content, status: "sending" },
      { role: "ai", content: "" },
    ]);
    await deliver(content, meIndex);
  }

  async function retry(index: number) {
    if (sending || !hydrated) return;
    const target = messages[index];
    if (!target || target.role !== "me") return;
    setMessages((current) => [...setStatusAt(current, index, "sending"), { role: "ai", content: "" }]);
    await deliver(target.content, index);
  }

  async function handleConfirm(overrides?: { email?: string; phone?: string; password?: string }) {
    if (!conversationId || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/conversations/${conversationId}/draft-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides ?? {}),
      });
      if (!response.ok) throw new Error("Não foi possível registrar o orçamento.");
      const quote = (await response.json()) as DraftQuoteResult;
      setConfirmedQuote(quote);
      if (quote.tokens) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o orçamento.");
    } finally {
      setConfirming(false);
    }
  }

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactEmail.trim()) {
      setError("informe um e-mail pra receber a cotação.");
      return;
    }
    handleConfirm({
      email: contactEmail.trim(),
      phone: contactPhone.trim() || undefined,
      password: contactPassword.trim() || undefined,
    });
  }

  function goToQuotes() {
    onClose();
    router.push("/portal/orcamentos");
  }

  function renderPreview() {
    if (!preview) return null;
    const grounded = preview.grounding_status === "grounded";
    return (
      <div className={styles.previewCard}>
        <div className={styles.previewTitle}>Prévia do diagnóstico</div>
        <div className={styles.previewSummary}>{preview.problem_summary || "A definir"}</div>
        {preview.services_of_interest.length > 0 && (
          <div className={styles.previewMeta}>{preview.services_of_interest.join(" · ")}</div>
        )}
        {(preview.budget_range || preview.timeline) && (
          <div className={styles.previewMeta}>
            {preview.budget_range && <span>{preview.budget_range}</span>}
            {preview.timeline && <span>{preview.timeline}</span>}
          </div>
        )}
        <div className={grounded ? styles.previewSource : styles.previewWarning}>
          {grounded
            ? "Baseado no conhecimento disponível."
            : "Faixa preliminar; a base não trouxe uma referência suficiente."}
        </div>
        {preview.missing_information.length > 0 && (
          <div className={styles.previewMissing}>
            Ainda falta: {preview.missing_information.join(", ")}.
          </div>
        )}
      </div>
    );
  }

  if (!portalReady) return null;

  if (confirmedQuote) {
    return createPortal(
      <div className={styles.scrim} onClick={onClose}>
        <div className={styles.card} onClick={(e) => e.stopPropagation()}>
          <div className={styles.confirmHead}>
            <div className={styles.confirmCheck}>✓</div>
            <h3 className={styles.confirmTitle}>Cotação registrada</h3>
            <p className={styles.confirmText}>
              {confirmedQuote.pending_account_link
                ? "Esse e-mail já é de um cliente nosso — avisamos o dono da conta pra conferir o pedido."
                : "O Marcos revisa o escopo e a faixa antes de virar proposta — normalmente em até 1 dia útil."}
            </p>
          </div>
          <div className={styles.confirmCard}>
            <div className={styles.confirmCardTop}>
              <span className={styles.mono}>{confirmedQuote.reference}</span>
              <span className={styles.awaitingBadge}>aguardando revisão</span>
            </div>
            <div className={styles.confirmCardTitle}>{confirmedQuote.scope_summary}</div>
            {(confirmedQuote.price_range || confirmedQuote.timeline) && (
              <div className={styles.confirmCardMeta}>
                {confirmedQuote.price_range && <span>{confirmedQuote.price_range}</span>}
                {confirmedQuote.timeline && <span>{confirmedQuote.timeline}</span>}
                <span className={styles.confirmCardMuted}>estimativa — sujeita à revisão</span>
              </div>
            )}
          </div>
          {confirmedQuote.tokens ? (
            <button type="button" className={styles.submit} onClick={goToQuotes}>
              Ir para meu painel
            </button>
          ) : null}
          <div className={styles.altContact} onClick={onClose}>
            Preciso pedir outra coisa
          </div>
        </div>
      </div>,
      document.body
    );
  }

  if (minimized) {
    return createPortal(
      <button type="button" className={styles.launcher} onClick={() => setMinimized(false)}>
        <span className={styles.statusDot} />
        DevButter IA
        <span className={styles.launcherHint}>{sending ? "digitando…" : "toque para abrir"}</span>
      </button>,
      document.body
    );
  }

  return createPortal(
    <div className={styles.scrim} onClick={onClose}>
      <div
        className={styles.card}
        style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={styles.head}
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
        >
          <div className={styles.headMeta}>
            <span className={styles.statusDot} />
            <div>
              <div className={styles.headTitle}>DevButter IA</div>
              <div className={styles.headStatus}>{sending ? "digitando…" : "online · novo orçamento"}</div>
            </div>
          </div>
          <div className={styles.headActions}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => setMinimized(true)}
              aria-label="Minimizar"
            >
              –
            </button>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
              ✕
            </button>
          </div>
        </div>

        <div className={styles.thread}>
          {messages.map((m, i) => {
            if (m.content === "") return null;
            if (m.status === "failed") {
              return (
                <div key={i} className={styles.failedRow}>
                  <button
                    type="button"
                    className={styles.retryBtn}
                    onClick={() => retry(i)}
                    disabled={sending}
                    aria-label="Tentar enviar de novo"
                    title="Tentar enviar de novo"
                  >
                    ↻
                  </button>
                  <div className={`${styles.msg} ${styles.msgMe} ${styles.msgFailed}`}>{m.content}</div>
                </div>
              );
            }
            return (
              <div key={i} className={`${styles.msg} ${m.role === "ai" ? styles.msgAi : styles.msgMe}`}>
                {m.content}
              </div>
            );
          })}
          {streamingEmpty && (
            <div className={styles.typing}>
              <span className={styles.typingDot} style={{ animationDelay: "0s" }} />
              <span className={styles.typingDot} style={{ animationDelay: ".2s" }} />
              <span className={styles.typingDot} style={{ animationDelay: ".4s" }} />
            </div>
          )}
        </div>

        {showComposer ? (
          <div className={styles.composer}>
            <textarea
              className={styles.textarea}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex: quero automatizar o atendimento da loja no WhatsApp…"
              disabled={sending || !hydrated}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" className={styles.submit} onClick={send} disabled={!draft.trim() || sending || !hydrated}>
              {sending ? "Enviando…" : "Enviar"}
            </button>
          </div>
        ) : showContactStep ? (
          <form className={styles.contactForm} onSubmit={handleContactSubmit}>
            {renderPreview()}
            <div className={styles.contactFieldRow}>
              <div className={styles.contactField}>
                <div className={styles.contactFieldLabel}>
                  e-mail <span className={styles.required}>obrigatório</span>
                </div>
                <input
                  className={styles.contactInput}
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="voce@empresa.com.br"
                  required
                />
              </div>
              <div className={styles.contactField}>
                <div className={styles.contactFieldLabel}>
                  whatsapp <span className={styles.optional}>opcional</span>
                </div>
                <input
                  className={styles.contactInput}
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="(41) 99999-9999"
                />
              </div>
            </div>
            <div className={styles.contactField}>
              <div className={styles.contactFieldLabel}>senha</div>
              <input
                className={styles.contactInput}
                type="password"
                value={contactPassword}
                onChange={(e) => setContactPassword(e.target.value)}
                placeholder="mínimo 8 caracteres"
              />
              <div className={styles.contactHint}>ou receba um link mágico por e-mail</div>
            </div>
            <button type="submit" className={styles.submit} disabled={confirming}>
              {confirming ? "Registrando…" : "Criar conta e enviar cotação"}
            </button>
            <div className={styles.altContact} onClick={() => setForceComposer(true)}>
              Continuar conversando
            </div>
          </form>
        ) : showReadyPanel ? (
          <div className={styles.readyPanel}>
            {renderPreview()}
            <button type="button" className={styles.submit} onClick={() => handleConfirm()} disabled={confirming}>
              {confirming ? "Registrando…" : "Confirmar e enviar"}
            </button>
            <div className={styles.altContact} onClick={() => setForceComposer(true)}>
              Continuar conversando
            </div>
          </div>
        ) : null}

        {error && <div className={styles.errorText}>{error}</div>}
      </div>
    </div>,
    document.body
  );
}
