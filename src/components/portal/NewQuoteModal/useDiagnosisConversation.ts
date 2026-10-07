"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { PUBLIC_SOCKET_URL } from "@/lib/portal/config";
import type {
  ConversationRead,
  DiagnosisPreview,
  DraftQuoteOverrides,
  DraftQuoteResult,
  Message,
  NextStep,
  ProductOption,
} from "./types";

type JoinAck = { ok: boolean; detail?: string };

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

/**
 * The diagnosis conversation itself — resume-or-start, Socket.IO streaming,
 * option picks, the collecting mini-form and draft-quote — with no UI. The
 * portal workspace (NewQuoteModal) and the public site panel (DiagnosisPanel)
 * render it two different ways on top of this one implementation.
 */
export default function useDiagnosisConversation({
  initialMessage,
  onTurn,
}: {
  initialMessage: string;
  /** Called with the preview after every streamed turn (and on resume). */
  onTurn?: (preview: DiagnosisPreview | null, resumed: boolean) => void;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "ai", content: initialMessage }]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [preview, setPreview] = useState<DiagnosisPreview | null>(null);
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmedQuote, setConfirmedQuote] = useState<DraftQuoteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinedConversationsRef = useRef<Set<string>>(new Set());
  const onTurnRef = useRef(onTurn);

  useEffect(() => {
    onTurnRef.current = onTurn;
  }, [onTurn]);

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
          onTurnRef.current?.(body.conversation.draft_preview, true);
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
  }, [initialMessage]);

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
    content: string,
    selection?: { field: string; option_ids: string[] }
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
      socket.emit("send_message", {
        conversation_id: id,
        content,
        ...(selection ? { selection } : {}),
      });
    });
  }

  /** Runs the network round-trip for the `me` message at `meIndex`. On failure the
   * message is left in the thread flagged `failed` (never re-appended) so the user
   * can retry it in place instead of typing it again. */
  async function deliver(
    content: string,
    meIndex: number,
    selection?: { field: string; option_ids: string[] }
  ) {
    setSending(true);
    setError(null);

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        const conversationRes = await fetch("/api/portal/conversations", { method: "POST" });
        if (!conversationRes.ok) throw new Error("Não foi possível iniciar a conversa.");
        const conversation = (await conversationRes.json()) as { id: string };
        activeConversationId = conversation.id;
        setConversationId(activeConversationId);
      }

      const socket = await connectSocket();
      await joinConversation(socket, activeConversationId);
      const result = await streamReply(socket, activeConversationId, content, selection);
      setMessages((current) => setStatusAt(current, meIndex, undefined));
      setReadyToSubmit(result.ready_to_submit);
      setPreview(result.preview);
      onTurnRef.current?.(result.preview, false);
    } catch (err) {
      setMessages((current) => dropTrailingEmptyAi(setStatusAt(current, meIndex, "failed")));
      setError(err instanceof Error ? err.message : "Não foi possível continuar a conversa.");
    } finally {
      setSending(false);
    }
  }

  /** Sends a typed (or chip) message. Returns false when nothing went out. */
  async function send(text: string): Promise<boolean> {
    const content = text.trim();
    if (!content || sending || !hydrated) return false;
    const meIndex = messages.length;
    setMessages((current) => [
      ...current,
      { role: "me", content, status: "sending" },
      { role: "ai", content: "" },
    ]);
    await deliver(content, meIndex);
    return true;
  }

  /** Answer the current qualification turn by tapping options instead of
   * typing (canvas screen 3). butter_mind still only sees the synthesized
   * `content`; `selection` is persisted alongside the user turn for the
   * reviewer. */
  async function sendOption(step: NextStep, optionIds: string[]): Promise<boolean> {
    if (sending || !hydrated || optionIds.length === 0) return false;
    const labels = step.options.filter((o) => optionIds.includes(o.id)).map((o) => o.label);
    const content =
      step.selection_mode === "multi"
        ? `${step.prompt.replace(/[:?]?\s*$/, "")}: ${labels.join(", ")}`
        : labels.join(", ");
    const meIndex = messages.length;
    setMessages((current) => [
      ...current,
      { role: "me", content, status: "sending" },
      { role: "ai", content: "" },
    ]);
    await deliver(content, meIndex, { field: step.field, option_ids: optionIds });
    return true;
  }

  async function retry(index: number) {
    if (sending || !hydrated) return;
    const target = messages[index];
    if (!target || target.role !== "me") return;
    setMessages((current) => [...setStatusAt(current, index, "sending"), { role: "ai", content: "" }]);
    await deliver(target.content, index);
  }

  /** ADR-0004 `choosing` stage: the visitor picked one of the proposed paths.
   * Not a socket turn -- a plain POST that returns the recomputed preview. */
  async function selectOption(option: ProductOption) {
    if (!conversationId || sending || !hydrated) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/conversations/${conversationId}/select-option`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ option_key: option.key }),
      });
      if (!res.ok) throw new Error("Não foi possível confirmar a opção.");
      const turn = (await res.json()) as {
        reply: string;
        ready_to_submit: boolean;
        preview: DiagnosisPreview | null;
      };
      setMessages((current) => [
        ...current,
        { role: "me", content: `Escolhi: ${option.title}` },
        { role: "ai", content: turn.reply },
      ]);
      setReadyToSubmit(turn.ready_to_submit);
      setPreview(turn.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível confirmar a opção.");
    } finally {
      setSending(false);
    }
  }

  /** ADR-0004 `collecting` stage: the visitor filled the missing business
   * fields on the mini-form. PATCH merges them and recomputes the stage.
   * Resolves true when saved. */
  async function submitBusinessProfile(fields: Record<string, string>): Promise<boolean> {
    if (!conversationId || sending || !hydrated) return false;
    const body = Object.fromEntries(
      Object.entries(fields)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v)
    );
    if (Object.keys(body).length === 0) return false;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/conversations/${conversationId}/business-profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Não foi possível salvar os dados.");
      const turn = (await res.json()) as {
        ready_to_submit: boolean;
        preview: DiagnosisPreview | null;
      };
      setReadyToSubmit(turn.ready_to_submit);
      setPreview(turn.preview);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar os dados.");
      return false;
    } finally {
      setSending(false);
    }
  }

  /** Registers the draft quote. Resolves the result (also kept as
   * `confirmedQuote`) or null on failure (`error` is set). */
  async function confirm(overrides: DraftQuoteOverrides): Promise<DraftQuoteResult | null> {
    if (!conversationId || confirming) return null;
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/conversations/${conversationId}/draft-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overrides),
      });
      if (!response.ok) throw new Error("Não foi possível registrar o orçamento.");
      const quote = (await response.json()) as DraftQuoteResult;
      setConfirmedQuote(quote);
      return quote;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o orçamento.");
      return null;
    } finally {
      setConfirming(false);
    }
  }

  const clearConfirmed = useCallback(() => setConfirmedQuote(null), []);

  return {
    hydrated,
    messages,
    conversationId,
    readyToSubmit,
    preview,
    sending,
    confirming,
    confirmedQuote,
    error,
    setError,
    send,
    sendOption,
    retry,
    selectOption,
    submitBusinessProfile,
    confirm,
    clearConfirmed,
  };
}
