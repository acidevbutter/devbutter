"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./NewQuoteModal.module.scss";

type Message = { role: "ai" | "me"; content: string };

const INITIAL_AI_MESSAGE = "Oi! Vi que você já tem projetos com a gente. Me conta o que você precisa agora.";

// MOCKED concierge — same voice as the public site's Concierge component
// (src/components/Concierge), but scripted: no real POST /conversations
// call. Swap for the real flow once the backend conversation contract is
// wired up for the client portal.
const SCRIPTED_REPLIES = [
  "Entendi. Isso seria para um projeto novo ou algo dentro do que já estamos construindo?",
  "Combinado — vou registrar isso e nossa equipe entra em contato com uma proposta em breve.",
];

export default function NewQuoteModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([{ role: "ai", content: INITIAL_AI_MESSAGE }]);
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);

  function send() {
    const content = draft.trim();
    if (!content || submitted) return;
    const nextMessages: Message[] = [...messages, { role: "me", content }];
    const replyIndex = messages.filter((m) => m.role === "me").length;
    const reply = SCRIPTED_REPLIES[Math.min(replyIndex, SCRIPTED_REPLIES.length - 1)];
    nextMessages.push({ role: "ai", content: reply });
    setMessages(nextMessages);
    setDraft("");
    if (replyIndex >= SCRIPTED_REPLIES.length - 1) setSubmitted(true);
  }

  function handleDone() {
    router.refresh();
    onClose();
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
          <button type="button" className={styles.submit} onClick={handleDone}>
            Concluir
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
            <button type="button" className={styles.submit} onClick={send} disabled={!draft.trim()}>
              Enviar
            </button>
          </div>
        )}

        <div className={styles.altContact}>Prefiro falar direto com a DevButter</div>
      </div>
    </div>
  );
}
