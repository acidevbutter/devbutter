// Client-side shapes of the diagnosis conversation, shared by the portal
// workspace (NewQuoteModal) and the public site panel (DiagnosisPanel).
//
// No price field on purpose: the client never sees a price before the quote is
// approved (docs/plano-preco-so-apos-aprovacao.md). The HTTP BFFs strip
// `price_range`/`budget_range` (lib/portal/redact.ts); the Socket.IO preview
// still carries them (devbutter_backend#23), so leaving them out of these types
// is what keeps any render path from showing them.

export type Message = { role: "ai" | "me"; content: string; status?: "sending" | "failed" };

export type DraftQuoteResult = {
  quote_id: string;
  reference: string;
  scope_summary: string;
  timeline: string | null;
  /** `true` when the visitor became a client and is now logged in (the tokens
   * themselves only ever travel as httpOnly cookies). */
  tokens: true | null;
  pending_account_link: boolean;
};

export type NextStepOption = { id: string; label: string };
export type NextStep = {
  prompt: string;
  field: string;
  selection_mode: "single" | "multi";
  allow_free_text: boolean;
  options: NextStepOption[];
};

/** One "números do negócio" stat card in the live dossiê (canvas screen 2a).
 * `value` is free text; `computed` marks a figure the AI derived. */
export type BusinessMetric = { label: string; value: string; computed: boolean };

/** ADR-0004: one of the 2-3 paths the concierge proposes in the `choosing`
 * stage. `key` is a stable server-assigned slug. */
export type ProductOption = {
  key: string;
  title: string;
  summary: string;
  timeline: string | null;
  recommended: boolean;
};

export type DiagnosisStage = "qualifying" | "choosing" | "collecting" | "ready";

/** Live qualification slice butter_mind fills as the chat progresses. Feeds the
 * chip row + "X de N perguntas" counter on the public panel (canvas 1c) and the
 * whole left-hand dossiê in the portal workspace (canvas 2a). Optional/partial:
 * a conversation resumed from an older preview simply omits fields. */
export type BusinessProfile = {
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

export type QualificationProgress = { answered: number; total: number };

// Mirrors butter_mind `app/diagnosis/schemas.py::DiagnosisPreview` (canonical
// shape; snapshot in butter_mind `contracts/conversation_state.schema.json`)
// minus the price fields (see the header). devbutter_backend relays it
// verbatim -- it no longer re-declares it (ADR-0005). Keep this hand-written
// type in step with that schema until codegen lands.
export type DiagnosisPreview = {
  problem_summary: string;
  // ADR-0007: renamed from services_of_interest -- a light label taxonomy;
  // the real cost drivers live server-side in the (not yet rendered here)
  // scoping_vector.
  solution_kinds: string[];
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
  /** butter_mind's _SCOPING_CATALOG for the review step's editable fields
   * (canvas 1d-1e) and next_step pills. Keys match ScopingVector's field
   * names (solution_kinds, rush, ...). */
  field_options?: Record<string, NextStepOption[]>;
};

export type ConversationRead = {
  id: string;
  account_id: string | null;
  status: string;
  transcript: { role: string; content: string; selected?: { field: string; option_ids: string[] } }[];
  ready_to_submit: boolean;
  draft_preview: DiagnosisPreview | null;
};

/** Optional overrides the contact/review step sends with draft-quote. */
export type DraftQuoteOverrides = {
  solution_kinds?: string[];
  timeline?: string;
  email?: string;
  phone?: string;
  password?: string;
  contact_name?: string;
  contact_company?: string;
};
