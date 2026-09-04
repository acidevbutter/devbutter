"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { io, type Socket } from "socket.io-client";
import Logomark from "@/components/icons/Logomark";
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

type NextStepOption = { id: string; label: string };
type NextStep = {
  prompt: string;
  field: string;
  selection_mode: "single" | "multi";
  allow_free_text: boolean;
  options: NextStepOption[];
};

/** One "números do negócio" stat card in the live dossiê (canvas screen 2a).
 * `value` is free text; `computed` marks a figure the AI derived. */
type BusinessMetric = { label: string; value: string; computed: boolean };

/** ADR-0004: one of the 2-3 paths the concierge proposes in the `choosing`
 * stage. `key` is a stable server-assigned slug. */
type ProductOption = {
  key: string;
  title: string;
  summary: string;
  price_range: string | null;
  timeline: string | null;
  recommended: boolean;
};

type DiagnosisStage = "qualifying" | "choosing" | "collecting" | "ready";

/** The collecting-step fields (ADR-0004), keyed as butter_mind names them. */
const PROFILE_FIELD_LABELS: Record<string, string> = {
  business_name: "nome da empresa",
  segment: "segmento",
  city: "cidade / UF",
  volume: "volume",
  contact_name: "seu nome",
  contact_email: "e-mail",
  contact_phone: "whatsapp",
};

/** Live qualification slice butter_mind fills as the chat progresses. Feeds the
 * chip row + "X de N perguntas" counter on the public panel (canvas 1c) and the
 * whole left-hand dossiê in the portal workspace (canvas 2a). Optional/partial:
 * a conversation resumed from an older preview simply omits fields. */
type BusinessProfile = {
  company_name: string | null;
  is_legal_entity: boolean | null;
  segment: string | null;
  city: string | null;
  volume: string | null;
  metrics?: BusinessMetric[] | null;
  pain_points: string[];
  scope_modules: string[];
  contact_ready: boolean;
};

type QualificationProgress = { answered: number; total: number };

type DiagnosisPreview = {
  problem_summary: string;
  services_of_interest: string[];
  budget_range: string | null;
  timeline: string | null;
  missing_information: string[];
  grounding_status: string;
  next_step: NextStep | null;
  business_profile?: BusinessProfile | null;
  progress?: QualificationProgress | null;
  stage?: DiagnosisStage;
  options?: ProductOption[];
  selected_option_key?: string | null;
  missing_fields?: string[];
  /** butter_mind's _OPTION_CATALOG for the review step's editable fields
   * (canvas 1d-1e). Keys: "services_of_interest", "budget_range", "timeline".
   * The review checkbox/pill groups render from this; the *_OPTIONS consts
   * below are only the fallback for a preview from an older butter_mind. */
  field_options?: Record<string, NextStepOption[]>;
};

/** Fallback only — the live option lists come from `preview.field_options`
 * (butter_mind's _OPTION_CATALOG). Kept so the review step still renders if a
 * resumed/old preview omits `field_options`. */
const SERVICE_OPTIONS = [
  "Agente de IA",
  "Automação de processos",
  "Plataforma web / SaaS",
  "E-commerce",
  "Site institucional",
  "Dados / analytics",
];
const BUDGET_OPTIONS = [
  "Até R$ 10 mil",
  "R$ 10–30 mil",
  "R$ 30–80 mil",
  "Acima de R$ 80 mil",
  "Ainda não sei",
];
const TIMELINE_OPTIONS = ["O quanto antes", "1–3 meses", "3–6 meses", "Sem prazo fixo"];

/** Composer textarea auto-grows with its content up to this height (px), then
 * scrolls internally. Single knob for the "input acompanha o texto" behavior
 * (see docs plan §1 / §7). Keep in sync with `.textarea { max-height }` in the
 * module stylesheet. */
const COMPOSER_MAX_H = 160;

type ConversationRead = {
  id: string;
  account_id: string | null;
  status: string;
  transcript: { role: string; content: string; selected?: { field: string; option_ids: string[] } }[];
  ready_to_submit: boolean;
  draft_preview: DiagnosisPreview | null;
};

const INITIAL_AI_MESSAGE = "Oi! Vi que você já tem projetos com a gente. Me conta o que você precisa agora.";

const noopSubscribe = () => () => {};

function hhmm(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

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

/** The dossiê's 7 completeness checkpoints (canvas screen 2a ring: "5 / 7").
 * Kept client-side -- butter_mind's `progress` is the shorter chat-header
 * counter ("X de N perguntas"); the ring measures dossiê blocks. */
function dossierChecks(preview: DiagnosisPreview | null): boolean[] {
  const bp = preview?.business_profile ?? null;
  const metrics = bp?.metrics ?? [];
  const modules = bp?.scope_modules?.length
    ? bp.scope_modules
    : preview?.services_of_interest ?? [];
  const problem = (bp?.pain_points?.length ?? 0) > 0 || !!preview?.problem_summary?.trim();
  return [
    problem,
    !!(bp?.company_name || bp?.segment) || bp?.is_legal_entity != null,
    !!bp?.volume || metrics.length > 0,
    !!bp?.city,
    modules.length > 0,
    !!preview?.budget_range,
    !!preview?.timeline,
  ];
}

export default function NewQuoteModal({
  onClose,
  initialMessage = INITIAL_AI_MESSAGE,
  mode = "public",
  surface = "panel",
  openingIntents,
}: {
  onClose?: () => void;
  initialMessage?: string;
  /** "public": anonymous visitor -- shows the 1e contact/password step before
   * confirming. "portal": already-logged-in client -- skips straight to
   * confirm, matching canvas screen 1g ("sem passo de cadastro"). */
  mode?: "public" | "portal";
  /** "panel": público -- painel de coluna única ancorado à direita sobre o site
   * (canvas 1b), minimizável, sem arrastar. "workspace": portal -- overlay de
   * duas colunas (dossiê ao vivo à esquerda + chat à direita, canvas 2a),
   * minimizável, sem arrastar. */
  surface?: "panel" | "workspace";
  /** Hardcoded quick-start options shown under the very first AI message,
   * before any turn (canvas 1b chips). Tapping one sends it as the first
   * message. */
  openingIntents?: string[];
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
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactPassword, setContactPassword] = useState("");
  // Canvas 1e "empresa": prefilled from the chat's detected company until the
  // visitor edits it -- tracked as touched rather than seeded via an effect.
  const [contactCompany, setContactCompany] = useState("");
  const [companyTouched, setCompanyTouched] = useState(false);
  const [noCompany, setNoCompany] = useState(false);
  // Canvas 1e: required consent before "Criar conta e enviar cotação".
  const [consent, setConsent] = useState(false);
  // Canvas 1f: "enviado dd/mm · HH:MM" on the confirmation card. Captured at
  // confirm time (the backend doesn't return a timestamp today).
  const [confirmedAtLabel, setConfirmedAtLabel] = useState<string | null>(null);
  // Overlay entrance: panel slides from the right (canvas 1b "entra da direita
  // 240ms"); workspace fades + lifts. Cleared once the animation is done.
  const [entering, setEntering] = useState(true);
  // "hoje · HH:MM" divider at the top of the thread (panel surface). Rendered
  // only after `hydrated`, so the server/first-paint markup omits it and there
  // is no time-based hydration mismatch.
  const [startedAtLabel] = useState(() => `hoje · ${hhmm()}`);
  // Checkbox state for a multi-select in-chat next_step (canvas screen 3),
  // reset every turn.
  const [checkedOptionIds, setCheckedOptionIds] = useState<string[]>([]);
  // While selectable options are on screen the composer is hidden and the
  // thread is frozen; "escrever resposta" flips this to bring the composer
  // back for a free-text answer (honours next_step.allow_free_text). Reset
  // each turn by the effect below.
  const [writeInstead, setWriteInstead] = useState(false);
  // ADR-0004 collecting-step mini-form (missing business-profile fields) +
  // a "pular por agora" flag that drops back to the free composer.
  const [collectingDraft, setCollectingDraft] = useState<Record<string, string>>({});
  const [skipCollecting, setSkipCollecting] = useState(false);
  // Editable review step (canvas 1d-1e), seeded once from the preview.
  const [reviewServices, setReviewServices] = useState<string[]>([]);
  const [reviewBudget, setReviewBudget] = useState<string | null>(null);
  const [reviewTimeline, setReviewTimeline] = useState<string | null>(null);
  const reviewSeededRef = useRef(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRegionRef = useRef<HTMLDivElement | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const joinedConversationsRef = useRef<Set<string>>(new Set());
  // Canvas 2a: each dossiê block keeps the "aterrissou às HH:MM" stamp from the
  // first render it had content. butter_mind recomputes the profile every turn
  // with no memory of when a field filled, so the stamp is client-side.
  const dossierStamps = useRef<Map<string, string>>(new Map());
  // Canvas 2a chat column: the "N blocos foram pro dossiê" causality pill with
  // the fly particle. Set after a turn grows the dossiê; cleared on a timer.
  const [landed, setLanded] = useState(0);
  const prevChecksRef = useRef(0);

  useEffect(() => {
    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!entering) return;
    const t = setTimeout(() => setEntering(false), 320);
    return () => clearTimeout(t);
  }, [entering]);

  // Esc closes, keeping the draft (canvas 1b: "Esc fecha e guarda o rascunho").
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !minimized) closeOrHome();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minimized]);

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
          prevChecksRef.current = dossierChecks(body.conversation.draft_preview).filter(Boolean).length;
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

  // Seed the editable review fields from the preview the first time the chat
  // reports it's ready. `matchServices` keeps any service the visitor named
  // that isn't in the fixed catalog, so nothing they said is dropped.
  useEffect(() => {
    if (!readyToSubmit || reviewSeededRef.current) return;
    reviewSeededRef.current = true;
    const fromPreview = preview?.services_of_interest ?? [];
    const catalog =
      preview?.field_options?.services_of_interest?.map((o) => o.label) ?? SERVICE_OPTIONS;
    const merged = [...catalog];
    for (const s of fromPreview) {
      if (!merged.some((o) => o.toLowerCase() === s.toLowerCase())) merged.push(s);
    }
    setReviewServices(
      merged.filter(
        (o) =>
          fromPreview.some(
            (s) =>
              s.toLowerCase() === o.toLowerCase() ||
              s.toLowerCase().includes(o.toLowerCase()) ||
              o.toLowerCase().includes(s.toLowerCase())
          )
      )
    );
    setReviewBudget(preview?.budget_range ?? null);
    setReviewTimeline(preview?.timeline ?? null);
  }, [readyToSubmit, preview]);

  // Live option lists from butter_mind's _OPTION_CATALOG (preview.field_options);
  // the *_OPTIONS consts are the fallback for an older/omitted preview.
  const catalogFor = (field: string, fallback: string[]): string[] => {
    const fromServer = preview?.field_options?.[field];
    return fromServer && fromServer.length ? fromServer.map((o) => o.label) : fallback;
  };
  const serviceCatalog = catalogFor("services_of_interest", SERVICE_OPTIONS);
  const budgetCatalog = catalogFor("budget_range", BUDGET_OPTIONS);
  const timelineCatalog = catalogFor("timeline", TIMELINE_OPTIONS);

  const reviewServiceChoices = (() => {
    const base = [...serviceCatalog];
    for (const s of [...(preview?.services_of_interest ?? []), ...reviewServices]) {
      if (!base.some((o) => o.toLowerCase() === s.toLowerCase())) base.push(s);
    }
    return base;
  })();
  const budgetChoices =
    reviewBudget && !budgetCatalog.includes(reviewBudget)
      ? [reviewBudget, ...budgetCatalog]
      : budgetCatalog;
  const timelineChoices =
    reviewTimeline && !timelineCatalog.includes(reviewTimeline)
      ? [reviewTimeline, ...timelineCatalog]
      : timelineCatalog;

  const showContactStep = readyToSubmit && !forceComposer && mode === "public";
  const showReadyPanel = readyToSubmit && !forceComposer && mode === "portal";
  const showComposer = !readyToSubmit || forceComposer;

  // True when a tappable-options block is up (next_step pills, ADR-0004 option
  // cards, or the collecting mini-form) -- mirrors the render guards in
  // renderOptions / renderOptionCards / renderCollectingForm.
  const optionsStep = preview?.next_step ?? null;
  const optionsShowing =
    !sending &&
    ((!!optionsStep && optionsStep.options.length >= 2) ||
      (preview?.stage === "choosing" && (preview?.options?.length ?? 0) >= 2) ||
      (preview?.stage === "collecting" &&
        (preview?.missing_fields?.length ?? 0) > 0 &&
        !skipCollecting));
  // Hide the composer + freeze the thread while options are up, unless the
  // visitor asked to type instead. `writeInstead` is reset by the turn
  // handlers (send / sendOption / selectOption / submitBusinessProfile).
  const composerHidden = showComposer && optionsShowing && !writeInstead;
  const streamingEmpty =
    sending &&
    messages[messages.length - 1]?.role === "ai" &&
    messages[messages.length - 1]?.content === "";

  // Canvas 1b: "foco automático no textarea" once the panel has finished entering.
  useEffect(() => {
    if (showComposer && !entering && !minimized) textareaRef.current?.focus();
  }, [showComposer, entering, minimized]);

  // The composer textarea grows with its content up to COMPOSER_MAX_H, then
  // scrolls. Runs on every `draft` change (covers typing, the reset to "" after
  // send(), and a resumed conversation seeding the box).
  function autosizeComposer() {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, COMPOSER_MAX_H)}px`;
  }
  useEffect(() => {
    autosizeComposer();
  }, [draft, showComposer]);

  // When options take over and the thread freezes, park it at the bottom so the
  // options block is in view even after a long AI reply (item 4).
  useEffect(() => {
    if (!composerHidden) return;
    const el = scrollRegionRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [composerHidden, messages.length]);

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
      // Canvas 2a: count how many dossiê blocks just filled, to pulse the
      // "N blocos foram pro dossiê" pill + fly particle in the chat column.
      const now = dossierChecks(result.preview).filter(Boolean).length;
      const grew = now - prevChecksRef.current;
      prevChecksRef.current = now;
      if (grew > 0 && surface === "workspace") {
        setLanded(grew);
        window.setTimeout(() => setLanded(0), 2600);
      }
    } catch (err) {
      setMessages((current) => dropTrailingEmptyAi(setStatusAt(current, meIndex, "failed")));
      setError(err instanceof Error ? err.message : "Não foi possível continuar a conversa.");
    } finally {
      setSending(false);
    }
  }

  async function send(explicitContent?: string) {
    const content = (explicitContent ?? draft).trim();
    if (!content || sending || !hydrated) return;
    const meIndex = messages.length;
    if (explicitContent === undefined) setDraft("");
    setForceComposer(false);
    setCheckedOptionIds([]);
    setWriteInstead(false);
    setMessages((current) => [
      ...current,
      { role: "me", content, status: "sending" },
      { role: "ai", content: "" },
    ]);
    await deliver(content, meIndex);
  }

  /** Answer the current qualification turn by tapping options instead of
   * typing (canvas screen 3). butter_mind still only sees the synthesized
   * `content`; `selection` is persisted alongside the user turn for the
   * reviewer. */
  async function sendOption(step: NextStep, optionIds: string[]) {
    if (sending || !hydrated || optionIds.length === 0) return;
    const labels = step.options
      .filter((o) => optionIds.includes(o.id))
      .map((o) => o.label);
    const content =
      step.selection_mode === "multi"
        ? `${step.prompt.replace(/[:?]?\s*$/, "")}: ${labels.join(", ")}`
        : labels.join(", ");
    const meIndex = messages.length;
    setForceComposer(false);
    setCheckedOptionIds([]);
    setWriteInstead(false);
    setMessages((current) => [
      ...current,
      { role: "me", content, status: "sending" },
      { role: "ai", content: "" },
    ]);
    await deliver(content, meIndex, { field: step.field, option_ids: optionIds });
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
    setSkipCollecting(false);
    setWriteInstead(false);
    try {
      const res = await fetch(
        `/api/portal/conversations/${conversationId}/select-option`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ option_key: option.key }),
        }
      );
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
   * fields on the mini-form. PATCH merges them and recomputes the stage. */
  async function submitBusinessProfile() {
    if (!conversationId || sending || !hydrated) return;
    const body = Object.fromEntries(
      Object.entries(collectingDraft)
        .map(([k, v]) => [k, v.trim()])
        .filter(([, v]) => v)
    );
    if (Object.keys(body).length === 0) return;
    setSending(true);
    setError(null);
    setWriteInstead(false);
    try {
      const res = await fetch(
        `/api/portal/conversations/${conversationId}/business-profile`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!res.ok) throw new Error("Não foi possível salvar os dados.");
      const turn = (await res.json()) as {
        ready_to_submit: boolean;
        preview: DiagnosisPreview | null;
      };
      setReadyToSubmit(turn.ready_to_submit);
      setPreview(turn.preview);
      setCollectingDraft({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar os dados.");
    } finally {
      setSending(false);
    }
  }

  /** The edits made on the review step's checkbox/radio groups, only included
   * when they actually carry a value so an untouched field never blanks the
   * conversational extraction. */
  function reviewOverrides() {
    const out: {
      services_of_interest?: string[];
      budget_range?: string;
      timeline?: string;
    } = {};
    if (reviewServices.length) out.services_of_interest = reviewServices;
    if (reviewBudget) out.budget_range = reviewBudget;
    if (reviewTimeline) out.timeline = reviewTimeline;
    return out;
  }

  function stamp(d: Date) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} · ${hhmm(d)}`;
  }

  async function handleConfirm(overrides?: {
    email?: string;
    phone?: string;
    password?: string;
    contact_name?: string;
    contact_company?: string;
  }) {
    if (!conversationId || confirming) return;
    setConfirming(true);
    setError(null);
    try {
      const response = await fetch(`/api/portal/conversations/${conversationId}/draft-quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reviewOverrides(), ...(overrides ?? {}) }),
      });
      if (!response.ok) throw new Error("Não foi possível registrar o orçamento.");
      const quote = (await response.json()) as DraftQuoteResult;
      setConfirmedAtLabel(stamp(new Date()));
      setConfirmedQuote(quote);
      if (quote.tokens) router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registrar o orçamento.");
    } finally {
      setConfirming(false);
    }
  }

  const detectedLegalEntity = preview?.business_profile?.is_legal_entity === true;
  const showCompanyField = detectedLegalEntity && !noCompany;
  const companyValue = companyTouched
    ? contactCompany
    : preview?.business_profile?.company_name ?? "";

  function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim()) {
      setError("informe seu nome pra montar a cotação.");
      return;
    }
    if (!contactEmail.trim()) {
      setError("informe um e-mail pra receber a cotação.");
      return;
    }
    if (!consent) {
      setError("confirme a autorização de contato pra enviar a cotação.");
      return;
    }
    handleConfirm({
      email: contactEmail.trim(),
      phone: contactPhone.trim() || undefined,
      password: contactPassword.trim() || undefined,
      contact_name: contactName.trim(),
      // "" is meaningful: the visitor said "não tenho empresa" -> clear it.
      ...(detectedLegalEntity
        ? { contact_company: noCompany ? "" : companyValue.trim() }
        : {}),
    });
  }

  function goToQuotes() {
    onClose?.();
    router.push("/portal/orcamentos");
  }

  function closeOrHome() {
    if (onClose) onClose();
    else router.push("/");
  }

  /** From the confirmation card: drop back into the same thread (same
   * conversationId, same messages) with the composer open, without starting a
   * new conversation. The draft-quote already cleared the db_conversation_id
   * cookie and completed the butter_mind session, so a further message may be
   * rejected server-side -- that path surfaces as a normal failed-message
   * retry, and reopening the session is a separate follow-up. */
  function keepChatting() {
    setConfirmedQuote(null);
    setForceComposer(true);
  }

  /** Canvas 1b: quick-start pills under the first AI message, before any turn. */
  function renderOpeningIntents() {
    if (
      !openingIntents ||
      openingIntents.length === 0 ||
      preview?.next_step ||
      sending ||
      messages.length !== 1 ||
      messages[0].role !== "ai"
    ) {
      return null;
    }
    return (
      <div className={styles.optionsPills} role="group" aria-label="Sugestões para começar">
        {openingIntents.map((intent) => (
          <button
            key={intent}
            type="button"
            className={styles.optionPill}
            disabled={sending || !hydrated}
            onClick={() => send(intent)}
          >
            {intent}
          </button>
        ))}
      </div>
    );
  }

  /** Canvas screen 3: the concierge's tappable options for the current
   * qualification turn. Pills for single-select (tap sends immediately),
   * a checkbox group + "Confirmar" for multi-select. The composer stays
   * visible alongside (allow_free_text). */
  function renderOptions() {
    const step = preview?.next_step;
    if (!step || step.options.length < 2 || sending) return null;
    if (step.selection_mode === "multi") {
      return (
        <div role="group" aria-label={step.prompt}>
          <div className={styles.optionsGrid}>
            {step.options.map((o) => {
              const on = checkedOptionIds.includes(o.id);
              return (
                <label key={o.id} className={`${styles.optionCheck} ${on ? styles.optionCheckOn : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setCheckedOptionIds((cur) =>
                        on ? cur.filter((id) => id !== o.id) : [...cur, o.id]
                      )
                    }
                  />
                  <span className={styles.optionCheckBox} aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                  <span>{o.label}</span>
                </label>
              );
            })}
          </div>
          <button
            type="button"
            className={styles.optionsConfirm}
            disabled={checkedOptionIds.length === 0 || sending}
            onClick={() => sendOption(step, checkedOptionIds)}
          >
            Confirmar seleção
          </button>
        </div>
      );
    }
    return (
      <div className={styles.optionsPills} role="group" aria-label={step.prompt}>
        {step.options.map((o) => (
          <button
            key={o.id}
            type="button"
            className={styles.optionPill}
            disabled={sending}
            onClick={() => sendOption(step, [o.id])}
          >
            {o.label}
          </button>
        ))}
      </div>
    );
  }

  /** ADR-0004 `choosing` stage: the 2-3 proposed paths as cards, one flagged
   * "recomendado", each with a "Confirmar «título»" button. The composer stays
   * available below (the visitor can keep talking instead of picking). */
  function renderOptionCards() {
    const options = preview?.options ?? [];
    if (preview?.stage !== "choosing" || options.length < 2 || sending) return null;
    return (
      <div className={styles.optionCards} role="group" aria-label="Caminhos propostos">
        {options.map((o) => (
          <div
            key={o.key}
            className={`${styles.optionCard} ${o.recommended ? styles.optionCardRec : ""}`}
          >
            <div className={styles.optionCardHead}>
              <span className={styles.optionCardTitle}>{o.title}</span>
              {o.recommended && <span className={styles.optionCardBadge}>recomendado</span>}
            </div>
            <p className={styles.optionCardSummary}>{o.summary}</p>
            {(o.price_range || o.timeline) && (
              <div className={styles.optionCardMeta}>
                {o.price_range && <span>{o.price_range}</span>}
                {o.timeline && <span>{o.timeline}</span>}
              </div>
            )}
            <button
              type="button"
              className={styles.optionCardBtn}
              disabled={sending}
              onClick={() => selectOption(o)}
            >
              Confirmar “{o.title}”
            </button>
          </div>
        ))}
      </div>
    );
  }

  /** ADR-0004 `collecting` stage: a mini-form for the business-profile fields
   * butter_mind still needs, plus "pular por agora" to keep talking. */
  function renderCollectingForm() {
    const missing = preview?.missing_fields ?? [];
    if (preview?.stage !== "collecting" || missing.length === 0 || skipCollecting || sending) {
      return null;
    }
    return (
      <div className={styles.collectingForm}>
        <div className={styles.collectingHint}>Só falta confirmar:</div>
        {missing.map((field) => (
          <div key={field} className={styles.contactField}>
            <div className={styles.contactFieldLabel}>
              {PROFILE_FIELD_LABELS[field] ?? field}
            </div>
            <input
              className={styles.contactInput}
              type={field === "contact_email" ? "email" : "text"}
              value={collectingDraft[field] ?? ""}
              onChange={(e) =>
                setCollectingDraft((cur) => ({ ...cur, [field]: e.target.value }))
              }
            />
          </div>
        ))}
        <button
          type="button"
          className={styles.submit}
          disabled={
            sending || Object.values(collectingDraft).every((v) => !v?.trim())
          }
          onClick={submitBusinessProfile}
        >
          Confirmar dados
        </button>
        <div className={styles.altContact} onClick={() => setSkipCollecting(true)}>
          pular por agora
        </div>
      </div>
    );
  }

  /** Canvas 1d-1e: editable checkbox group of services + budget/timeline
   * radios shown on the review/contact step, seeded from the preview. */
  function renderReviewFields() {
    return (
      <div className={styles.reviewFields}>
        <div className={styles.reviewGroup} role="group" aria-label="Serviços de interesse">
          <div className={styles.reviewGroupLabel}>serviços de interesse</div>
          <div className={styles.optionsGrid}>
            {reviewServiceChoices.map((label) => {
              const on = reviewServices.includes(label);
              return (
                <label key={label} className={`${styles.optionCheck} ${on ? styles.optionCheckOn : ""}`}>
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={() =>
                      setReviewServices((cur) =>
                        on ? cur.filter((s) => s !== label) : [...cur, label]
                      )
                    }
                  />
                  <span className={styles.optionCheckBox} aria-hidden>
                    {on ? "✓" : ""}
                  </span>
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className={styles.reviewGroup} role="radiogroup" aria-label="Faixa de investimento">
          <div className={styles.reviewGroupLabel}>faixa de investimento</div>
          <div className={styles.optionsPills}>
            {budgetChoices.map((label) => (
              <button
                key={label}
                type="button"
                className={`${styles.optionPill} ${reviewBudget === label ? styles.optionPillOn : ""}`}
                aria-pressed={reviewBudget === label}
                onClick={() => setReviewBudget(reviewBudget === label ? null : label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.reviewGroup} role="radiogroup" aria-label="Prazo">
          <div className={styles.reviewGroupLabel}>prazo</div>
          <div className={styles.optionsPills}>
            {timelineChoices.map((label) => (
              <button
                key={label}
                type="button"
                className={`${styles.optionPill} ${reviewTimeline === label ? styles.optionPillOn : ""}`}
                aria-pressed={reviewTimeline === label}
                onClick={() => setReviewTimeline(reviewTimeline === label ? null : label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /** Canvas 1d: the "diagnóstico · rascunho" card — kicker + source, solution
   * title, short description, a 2-up faixa/prazo grid in Geist Mono, and the
   * diamond estimate caveat. Data is reformatted from `preview`; no new call. */
  function renderPreview() {
    if (!preview) return null;
    const grounded = preview.grounding_status === "grounded";
    const modules = preview.business_profile?.scope_modules?.length
      ? preview.business_profile.scope_modules
      : preview.services_of_interest;
    // Canvas 1d: the card headlines the solution, not the pain. Once a product
    // option is chosen (ADR-0004), use its title/summary; else fall back to the
    // problem summary and the module list.
    const chosen = preview.options?.find((o) => o.key === preview.selected_option_key);
    const title =
      chosen?.title || preview.problem_summary?.trim() || "Diagnóstico em rascunho";
    const desc = chosen?.summary || (modules.length > 0 ? modules.join(" · ") : null);
    return (
      <div className={styles.previewCard}>
        <div className={styles.previewCardHead}>
          <span className={styles.previewCardKicker}>diagnóstico · rascunho</span>
          <span className={styles.previewCardSource}>source: ai</span>
        </div>
        <h3 className={styles.previewCardTitle}>{title}</h3>
        {desc && <p className={styles.previewCardDesc}>{desc}</p>}
        <div className={styles.previewCardGrid}>
          <div className={styles.previewStat}>
            <div className={styles.previewStatLabel}>faixa estimada</div>
            <div className={styles.previewStatGreen}>{preview.budget_range || "a estimar"}</div>
          </div>
          <div className={styles.previewStat}>
            <div className={styles.previewStatLabel}>prazo estimado</div>
            <div className={styles.previewStatPlain}>{preview.timeline || "a estimar"}</div>
          </div>
        </div>
        <div className={styles.previewCardWarn}>
          <span className={styles.previewDiamond}>◆</span>
          faixa e prazo são estimativas — sujeitas à revisão do time da DevButter antes de virar
          proposta.
        </div>
        {!grounded && (
          <div className={styles.previewMissing}>
            Faixa preliminar; a base não trouxe uma referência suficiente.
          </div>
        )}
        {preview.missing_information.length > 0 && (
          <div className={styles.previewMissing}>
            Ainda falta: {preview.missing_information.join(", ")}.
          </div>
        )}
      </div>
    );
  }

  /** Canvas 1c: the captured-info chip row under the thread while qualifying
   * (public panel only — the portal workspace shows the full dossiê instead). */
  function renderCaptureChips() {
    const bp = preview?.business_profile;
    if (!bp || mode !== "public") return null;
    const chips: React.ReactNode[] = [];
    if (bp.company_name) {
      chips.push(
        <span key="empresa" className={styles.captureChip}>
          empresa: {bp.company_name} <span className={styles.captureEdit} aria-hidden>✎</span>
        </span>
      );
    } else if (bp.is_legal_entity === true) {
      chips.push(
        <span key="empresa" className={styles.captureChipMissing}>
          empresa: falta
        </span>
      );
    }
    if (bp.segment) {
      chips.push(
        <span key="segmento" className={styles.captureChip}>
          segmento: {bp.segment}
        </span>
      );
    }
    if (bp.city) {
      chips.push(
        <span key="cidade" className={styles.captureChip}>
          cidade: {bp.city}
        </span>
      );
    }
    if (bp.volume) {
      chips.push(
        <span key="volume" className={styles.captureChip}>
          volume: {bp.volume} <span className={styles.captureEdit} aria-hidden>✎</span>
        </span>
      );
    }
    for (const m of bp.metrics ?? []) {
      chips.push(
        <span key={`m-${m.label}`} className={styles.captureChip}>
          {m.label}: {m.value}
        </span>
      );
    }
    chips.push(
      <span
        key="contato"
        className={bp.contact_ready ? styles.captureChip : styles.captureChipMissing}
      >
        contato: {bp.contact_ready ? "ok" : "falta"}
      </span>
    );
    if (chips.length === 0) return null;
    return <div className={styles.captureChips}>{chips}</div>;
  }

  /** Canvas screen 2a: the live dossiê that assembles on the left of the portal
   * workspace as the conversation progresses. Blocks land with `rowIn`; the
   * live "números do negócio" card sweeps; faixa/prazo stay skeleton-locked
   * until `ready_to_submit`, then unlock with `tick`. */
  function renderDossier() {
    const bp = preview?.business_profile ?? null;
    const metrics = bp?.metrics ?? [];
    const modules = bp?.scope_modules?.length
      ? bp.scope_modules
      : preview?.services_of_interest ?? [];
    const pains = bp?.pain_points ?? [];
    const problemText = pains.length
      ? pains.join(". ")
      : preview?.problem_summary?.trim() ?? "";
    const checks = dossierChecks(preview);
    const answered = checks.filter(Boolean).length;
    const total = checks.length;
    const pct = Math.round((answered / total) * 100);
    const CIRC = 201; // 2·π·r, r = 32
    const dashOffset = CIRC - (CIRC * answered) / total;

    const stampFor = (id: string, has: boolean): string | null => {
      if (!has) return null;
      if (!dossierStamps.current.has(id)) dossierStamps.current.set(id, hhmm());
      return dossierStamps.current.get(id) ?? null;
    };

    const blockHead = (id: string, label: string, ok: boolean, extra?: React.ReactNode) => (
      <div className={styles.dossierBlockHead}>
        <span className={ok ? styles.dossierTick : styles.dossierTickMissing} aria-hidden>
          {ok ? "✓" : "◆"}
        </span>
        <span className={styles.dossierBlockLabel}>{label}</span>
        <span className={styles.dossierRule} />
        {extra ?? (stampFor(id, ok) && <span className={styles.dossierStamp}>{stampFor(id, ok)}</span>)}
      </div>
    );

    return (
      <div className={styles.dossierInner}>
        <div className={styles.dossierHead}>
          <div>
            <div className={styles.dossierKicker}>dossiê em construção</div>
            <h3 className={styles.dossierTitle}>{bp?.company_name || "Seu negócio"}</h3>
            <div className={styles.dossierSub}>
              {[bp?.segment, bp?.city].filter(Boolean).join(" · ") || "detectado no chat"}
            </div>
          </div>
          <div className={styles.dossierRing}>
            <svg width="74" height="74" viewBox="0 0 74 74" aria-hidden>
              <circle cx="37" cy="37" r="32" fill="none" stroke="rgba(255,255,255,.09)" strokeWidth="5" />
              <circle
                cx="37"
                cy="37"
                r="32"
                fill="none"
                stroke="#79E59B"
                strokeWidth="5"
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={dashOffset}
                transform="rotate(-90 37 37)"
                className={styles.dossierRingArc}
              />
            </svg>
            <div className={styles.dossierRingLabel}>
              <div className={styles.dossierRingPct}>
                {pct}
                <span>%</span>
              </div>
              <div className={styles.dossierRingFrac}>
                {answered} / {total}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.dossierBody}>
          <div className={styles.dossierBlock}>
            {blockHead("problema", "o problema", checks[0])}
            <p className={styles.dossierProblem}>
              {problemText ||
                "conte o problema e eu começo a montar seu diagnóstico aqui."}
            </p>
          </div>

          <div className={styles.dossierBlock}>
            {blockHead("numeros", "números do negócio", checks[2])}
            {metrics.length > 0 ? (
              <>
                <div className={styles.dossierStats}>
                  {metrics.map((m, i) => (
                    <div
                      key={`${m.label}-${i}`}
                      className={m.computed ? styles.dossierStatLive : styles.dossierStat}
                    >
                      {m.computed && <span className={styles.dossierStatSweep} aria-hidden />}
                      <div className={styles.dossierStatValue}>{m.value}</div>
                      <div className={styles.dossierStatLabel}>{m.label}</div>
                    </div>
                  ))}
                </div>
                {metrics.some((m) => m.computed) && (
                  <div className={styles.dossierStatCaption}>
                    ↑ calculado pela IA a partir do volume
                  </div>
                )}
              </>
            ) : (
              <div className={styles.dossierStats}>
                <span className={styles.dossierSkeleton} />
                <span className={styles.dossierSkeleton} />
                <span className={styles.dossierSkeleton} />
              </div>
            )}
          </div>

          <div className={styles.dossierBlock}>
            {blockHead(
              "escopo",
              "escopo se formando",
              checks[4],
              modules.length > 0 ? (
                <span className={styles.dossierCount}>
                  {modules.length} {modules.length === 1 ? "módulo" : "módulos"}
                </span>
              ) : undefined
            )}
            {modules.length > 0 ? (
              <div className={styles.dossierChips}>
                {modules.map((mod, i) => (
                  <span
                    key={mod}
                    className={
                      i === modules.length - 1 ? styles.dossierChipNew : styles.dossierChip
                    }
                  >
                    {mod}
                  </span>
                ))}
              </div>
            ) : (
              <div className={styles.dossierChips}>
                <span className={styles.dossierSkeletonChip} />
                <span className={styles.dossierSkeletonChip} />
              </div>
            )}
          </div>

          <div className={`${styles.dossierBlock} ${readyToSubmit ? "" : styles.dossierBlockLocked}`}>
            {blockHead(
              "faixa",
              readyToSubmit ? "faixa e prazo" : "faixa e prazo · bloqueado",
              readyToSubmit && (checks[5] || checks[6])
            )}
            {readyToSubmit ? (
              <div className={styles.dossierUnlockGrid}>
                <div className={styles.dossierUnlockStat}>
                  <div className={styles.dossierStatLabel}>faixa estimada</div>
                  <div className={styles.dossierUnlockValueGreen}>
                    {preview?.budget_range || "a estimar"}
                  </div>
                </div>
                <div className={styles.dossierUnlockStat}>
                  <div className={styles.dossierStatLabel}>prazo estimado</div>
                  <div className={styles.dossierUnlockValue}>
                    {preview?.timeline || "a estimar"}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className={styles.dossierUnlockGrid}>
                  <div className={styles.dossierLockBox}>
                    <div className={styles.dossierStatLabel}>faixa estimada</div>
                    <span className={styles.dossierSkeletonLine} />
                  </div>
                  <div className={styles.dossierLockBox}>
                    <div className={styles.dossierStatLabel}>prazo estimado</div>
                    <span className={styles.dossierSkeletonLine} />
                  </div>
                </div>
                <div className={styles.dossierLockHint}>
                  {preview?.missing_information?.length
                    ? `libera quando você responder: ${preview.missing_information.join(", ")}.`
                    : "libera quando o escopo fechar."}
                </div>
              </>
            )}
          </div>
        </div>

        <div className={styles.dossierFoot}>
          <span>
            cada linha é editável — <span className={styles.dossierFootEdit}>✎ corrigir</span>
          </span>
          <span>vira o pedido COT no envio</span>
        </div>
      </div>
    );
  }

  if (!portalReady) return null;

  /** Wraps the chat column in the right shell for this surface and portals it
   * onto <body>. `workspace` adds the live dossiê as a second column. */
  const shell = (children: React.ReactNode) => {
    if (surface === "workspace") {
      return createPortal(
        <div
          className={`${styles.scrim} ${entering ? styles.scrimEnter : ""}`}
          onClick={closeOrHome}
        >
          <div
            className={`${styles.workspace} ${entering ? styles.workspaceEnter : ""}`}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Novo orçamento com a IA"
          >
            <aside className={styles.dossier}>{renderDossier()}</aside>
            <div className={styles.chatCol}>{children}</div>
          </div>
        </div>,
        document.body
      );
    }
    return createPortal(
      <div
        className={`${styles.scrim} ${styles.scrimPanel} ${entering ? styles.scrimEnter : ""}`}
        onClick={closeOrHome}
      >
        <div
          className={`${styles.panel} ${entering ? styles.panelEnter : ""}`}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="Falar com a IA da DevButter"
        >
          {children}
        </div>
      </div>,
      document.body
    );
  };

  if (confirmedQuote) {
    return shell(
      <div className={styles.scrollRegion}>
        <div className={styles.confirmHead}>
          <div className={styles.confirmCheck}>✓</div>
          <h3 className={styles.confirmTitle}>Cotação registrada</h3>
          <p className={styles.confirmText}>
            {confirmedQuote.pending_account_link
              ? "Esse e-mail já é de um cliente nosso — avisamos o dono da conta pra conferir o pedido."
              : `${
                  contactEmail.trim()
                    ? `Confirmação enviada para ${contactEmail.trim()}. `
                    : ""
                }O time da DevButter revisa o escopo e a faixa antes de virar proposta — normalmente em até 1 dia útil.`}
          </p>
        </div>
        <div className={styles.confirmCard}>
          <div className={styles.confirmCardTop}>
            <span className={styles.mono}>{confirmedQuote.reference}</span>
            <span className={styles.awaitingBadge}>aguardando revisão</span>
          </div>
          <div className={styles.confirmCardTitle}>{confirmedQuote.scope_summary}</div>
          <div className={styles.confirmCardMeta}>
            {confirmedQuote.price_range && <span>faixa {confirmedQuote.price_range}</span>}
            {confirmedQuote.timeline && <span>prazo {confirmedQuote.timeline}</span>}
            {confirmedAtLabel && (
              <span className={styles.confirmCardMuted}>enviado {confirmedAtLabel}</span>
            )}
          </div>
          <div className={styles.confirmCardNote}>
            a conversa completa fica anexada ao pedido — você acompanha o mesmo histórico.
          </div>
        </div>
        {confirmedQuote.tokens ? (
          <button type="button" className={styles.submit} onClick={goToQuotes}>
            Ir para meu painel
          </button>
        ) : null}
        <div className={styles.altContactRow}>
          <span onClick={keepChatting}>Continuar conversando</span>
          <span className={styles.altContactSep} aria-hidden>
            ·
          </span>
          <span onClick={closeOrHome}>
            {mode === "portal" ? "Preciso pedir outra coisa" : "Voltar para a home"}
          </span>
        </div>
      </div>
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

  const headStatus = sending
    ? "digitando…"
    : surface === "workspace"
      ? "online · novo orçamento"
      : "online · responde na hora";

  return shell(
    <>
      <div className={styles.head}>
        <div className={styles.headMeta}>
          <Logomark width={21} height={25} />
          <div>
            <div className={styles.headTitle}>DevButter IA</div>
            <div className={styles.headStatus}>
              <span className={styles.statusDot} />
              {headStatus}
            </div>
          </div>
        </div>
        <div className={styles.headActions}>
          {showComposer && preview?.progress && preview.progress.total > 0 && (
            <span className={styles.headProgress}>
              {Math.min(preview.progress.answered, preview.progress.total)} de{" "}
              {preview.progress.total} perguntas
            </span>
          )}
          {!showComposer && readyToSubmit && (
            <span className={`${styles.headProgress} ${styles.headProgressReady}`}>
              diagnóstico pronto
            </span>
          )}
          <button
            type="button"
            className={styles.iconBtn}
            onClick={() => setMinimized(true)}
            aria-label="Minimizar"
          >
            –
          </button>
          <button
            type="button"
            className={styles.close}
            onClick={closeOrHome}
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        ref={scrollRegionRef}
        className={`${styles.scrollRegion} ${composerHidden ? styles.scrollFrozen : ""}`}
      >
      <div className={styles.thread}>
        {surface === "panel" && hydrated && (
          <div className={styles.dateDivider}>{startedAtLabel}</div>
        )}
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
              {m.role === "ai"
                ? m.content.split(/\n{2,}/).map((para, k) => (
                    <p key={k} className={styles.msgP}>
                      {para}
                    </p>
                  ))
                : m.content}
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
        {landed > 0 && (
          <div className={styles.landedPill}>
            <span className={styles.landedDot} />
            {landed} {landed === 1 ? "bloco foi" : "blocos foram"} pro dossiê
            <span className={styles.flyDot} aria-hidden />
          </div>
        )}
      </div>

      {showComposer ? (
        <>
          {renderCaptureChips()}
          {renderOpeningIntents()}
          {renderOptions()}
          {renderOptionCards()}
          {renderCollectingForm()}
          {composerHidden ? (
            <button
              type="button"
              className={styles.writeInsteadLink}
              onClick={() => setWriteInstead(true)}
            >
              escrever resposta
            </button>
          ) : (
            <>
              <div className={styles.composer}>
                <div className={styles.composerRow}>
                  <textarea
                    ref={textareaRef}
                    className={styles.textarea}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={
                      preview?.next_step
                        ? "…ou escreva a sua resposta"
                        : "conta o que você precisa…"
                    }
                    disabled={sending || !hydrated}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={styles.send}
                    onClick={() => send()}
                    disabled={!draft.trim() || sending || !hydrated}
                    aria-label="Enviar"
                  >
                    {sending ? "…" : "↑"}
                  </button>
                </div>
              </div>
              {surface === "panel" && (
                <div className={styles.composerHint}>
                  enter envia · shift+enter quebra linha · sem cadastro pra conversar
                </div>
              )}
            </>
          )}
        </>
      ) : showContactStep ? (
        <form className={styles.contactForm} onSubmit={handleContactSubmit}>
          {renderPreview()}
          {renderReviewFields()}
          <div className={styles.contactField}>
            <div className={styles.contactFieldLabel}>
              seu nome <span className={styles.required}>obrigatório</span>
            </div>
            <input
              className={styles.contactInput}
              type="text"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="como devemos te chamar"
              autoComplete="name"
              required
            />
          </div>
          {detectedLegalEntity && (
            <div className={styles.contactField}>
              <div className={styles.contactFieldLabel}>
                empresa <span className={styles.detected}>detectado no chat</span>
              </div>
              {showCompanyField ? (
                <>
                  <input
                    className={`${styles.contactInput} ${styles.contactInputDetected}`}
                    type="text"
                    value={companyValue}
                    onChange={(e) => {
                      setCompanyTouched(true);
                      setContactCompany(e.target.value);
                    }}
                    placeholder="nome da empresa"
                    autoComplete="organization"
                  />
                  <button
                    type="button"
                    className={styles.contactToggle}
                    onClick={() => setNoCompany(true)}
                  >
                    não tenho empresa — é pra mim mesmo
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={styles.contactToggle}
                  onClick={() => setNoCompany(false)}
                >
                  tenho empresa — quero informar
                </button>
              )}
            </div>
          )}
          <div className={styles.contactFieldRow}>
            <div className={styles.contactField}>
              <div className={styles.contactFieldLabel}>
                e-mail <span className={styles.required}>obrigatório</span>
              </div>
              <input
                className={`${styles.contactInput} ${styles.contactInputDetected}`}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="voce@empresa.com.br"
                autoComplete="email"
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
                autoComplete="tel"
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
              autoComplete="new-password"
            />
            <div className={styles.contactHint}>
              mínimo 8 caracteres · ou receba um link mágico por e-mail
            </div>
          </div>
          <label className={styles.consentRow}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span className={styles.consentBox} aria-hidden>
              {consent ? "✓" : ""}
            </span>
            <span>
              Autorizo a DevButter a me contatar sobre esta cotação. Posso apagar meus dados
              quando quiser.
            </span>
          </label>
          <button
            type="submit"
            className={styles.submit}
            disabled={confirming || !consent}
          >
            {confirming ? "Registrando…" : "Criar conta e enviar cotação"}
          </button>
          <div className={styles.altContact} onClick={() => setForceComposer(true)}>
            Continuar conversando
          </div>
          <div className={styles.contactFootnote}>
            <span aria-hidden>↑</span>
            a conversa fica salva mesmo se você fechar agora — o link volta pra este ponto.
          </div>
        </form>
      ) : showReadyPanel ? (
        <div className={styles.readyPanel}>
          {renderPreview()}
          {renderReviewFields()}
          <div className={styles.actionFooter}>
            <button type="button" className={styles.submit} onClick={() => handleConfirm()} disabled={confirming}>
              {confirming ? "Registrando…" : "Confirmar e enviar"}
            </button>
            <div className={styles.altContactRow}>
              <span onClick={() => setForceComposer(true)}>Quero ajustar algo</span>
              <span className={styles.altContactSep} aria-hidden>·</span>
              <span onClick={() => setForceComposer(true)}>Continuar conversando</span>
            </div>
          </div>
        </div>
      ) : null}

      {error && <div className={styles.errorText}>{error}</div>}
      </div>
    </>
  );
}
