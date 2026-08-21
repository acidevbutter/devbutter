"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NewQuoteModal.module.scss";

type Message = { role: "ai" | "me"; content: string };

const INITIAL_AI_MESSAGE = "Oi! Vi que você já tem projetos com a gente. Me conta o que você precisa agora.";

export default function NewQuoteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{ role: "ai", content: INITIAL_AI_MESSAGE }]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const content = draft.trim();
    if (!content || submitted || busy) return;
    setBusy(true);
    setError(null);
    setDraft("");

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const conversationRes = await fetch("/api/portal/conversations", { method: "POST" });
        if (!conversationRes.ok) throw new Error("Não foi possível iniciar a conversa.");
        const conversation = (await conversationRes.json()) as { id: string };
        activeConversationId = conversation.id;
        setConversationId(activeConversationId);
      }

      const turnRes = await fetch(`/api/portal/conversations/${activeConversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!turnRes.ok) throw new Error("Não foi possível enviar sua mensagem.");

      const turn = (await turnRes.json()) as { reply: string; ready_to_submit: boolean };
      setMessages((current) => [...current, { role: "me", content }, { role: "ai", content: turn.reply }]);
      setSubmitted(turn.ready_to_submit);
    } catch (err) {
      setDraft(content);
      setError(err instanceof Error ? err.message : "Não foi possível continuar a conversa.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDone() {
    if (!conversationId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/conversations/${conversationId}/draft-quote`, { method: "POST" });
      if (!response.ok) throw new Error("Não foi possível registrar o orçamento.");
      router.refresh();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o orçamento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.scrim} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.head}>
          <div className={styles.kick}>novo orçamento</div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className={styles.thread}>
          {messages.map((m, i) => (
            <div key={i} className={`${styles.msg} ${m.role === "ai" ? styles.msgAi : styles.msgMe}`}>
              {m.content}
            </div>
          ))}
        </div>

        {submitted ? (
          <button type="button" className={styles.submit} onClick={handleDone} disabled={busy}>
            {busy ? "Registrando…" : "Concluir"}
          </button>
        ) : (
          <div className={styles.composer}>
            <textarea
              className={styles.textarea}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ex: quero automatizar o atendimento da loja no WhatsApp…"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
            />
            <button type="button" className={styles.submit} onClick={send} disabled={!draft.trim() || busy}>
              {busy ? "Enviando…" : "Enviar"}
            </button>
          </div>
        )}

        {error && <div style={{ color: "var(--db-pink)", fontSize: 12 }}>{error}</div>}

        <div className={styles.altContact}>Prefiro falar direto com a DevButter</div>
      </div>
    </div>
  );
}
