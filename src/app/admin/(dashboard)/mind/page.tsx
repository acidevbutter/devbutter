import { AdminApiError } from "@/lib/admin/api";
import { updateMindBudgetAction, updateMindGovernanceAction } from "@/lib/admin/actions/mind";
import { getMindDashboardData, mindBudgetFlows } from "@/lib/admin/services/mind";
import Button from "@/components/admin/ui/Button/Button";
import styles from "./MindDashboard.module.scss";

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value));
}

export default async function AdminMindDashboardPage() {
  const result = await getMindDashboardData()
    .then((data) => ({ data, error: null }))
    .catch((error: unknown) => ({ data: null, error }));

  if (!result.data) {
    const detail = result.error instanceof AdminApiError
      ? String(result.error.detail ?? result.error.message)
      : "Falha ao consultar a Mind API.";
    return (
      <div className={styles.unavailable}>
        <h1 className={styles.title}>IA &amp; Métricas</h1>
        <p>{detail}</p>
        <p className={styles.note}>Confirme a conectividade privada e a chave interna entre backend e butter_mind.</p>
      </div>
    );
  }

  const { overview, governance, usage, budgets } = result.data;
  const usageByFlow = new Map(usage.flows.map((flow) => [flow.flow, flow]));
  const budgetByFlow = new Map(budgets.filter((budget): budget is NonNullable<typeof budget> => budget !== null).map((budget) => [budget.flow, budget]));
  const groundingRate = overview.assistant_turns
    ? Math.round((overview.grounded_turns / overview.assistant_turns) * 100)
    : 0;

  return (
      <div className={styles.page}>
        <div className={styles.heading}>
          <div>
            <h1 className={styles.title}>IA &amp; Métricas</h1>
            <p className={styles.subtitle}>
              diagnóstico, grounding e governança do butter_mind
            </p>
          </div>
          <span className={styles.privatePill}>interno · API privada</span>
        </div>

        <section className={styles.tiles} aria-label="Resumo da IA">
          <Metric label="sessões" value={formatNumber(overview.diagnosis_sessions)} hint={`${overview.sessions_in_progress} em andamento`} />
          <Metric label="leads enviados" value={formatNumber(overview.submitted_requests)} hint={`${overview.possibly_ungrounded_requests} pedem revisão`} warning={overview.possibly_ungrounded_requests > 0} />
          <Metric label="grounding" value={`${groundingRate}%`} hint={`${overview.grounded_turns} de ${overview.assistant_turns} respostas`} />
          <Metric label="tokens medidos" value={formatNumber(overview.input_tokens + overview.output_tokens)} hint={`${overview.turns_without_token_usage} turnos sem uso`} warning={overview.turns_without_token_usage > 0} />
        </section>

        <div className={styles.grid}>
          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Uso por modelo</h2>
                <p>Somente tokens retornados pelo provedor.</p>
              </div>
            </header>
            {overview.model_usage.length ? (
              <div className={styles.table}>
                <div className={styles.tableHead}>
                  <span>modelo</span><span>turnos</span><span>entrada</span><span>cache</span><span>saída</span>
                </div>
                {overview.model_usage.map((usage) => (
                  <div className={styles.tableRow} key={usage.model ?? "unknown"}>
                    <span>{usage.model ?? "streaming / não informado"}</span>
                    <span>{formatNumber(usage.turns)}</span>
                    <span>{formatNumber(usage.input_tokens)}</span>
                    <span>{formatNumber(usage.cached_input_tokens)}</span>
                    <span>{formatNumber(usage.output_tokens)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <Empty text="Ainda não há respostas da IA registradas." />
            )}
            {overview.turns_without_token_usage > 0 && (
              <p className={styles.note}>
                Streaming atual não retorna uso de tokens; esses turnos não entram nos totais.
              </p>
            )}
          </section>

          <section className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <h2>Base de conhecimento</h2>
                <p>RAG usado para grounding das respostas.</p>
              </div>
              <Button href="/admin/knowledge" variant="outline">Precificação</Button>
            </header>
            <div className={styles.knowledgeStats}>
              <div><strong>{formatNumber(overview.knowledge_sources)}</strong><span>fontes</span></div>
              <div><strong>{formatNumber(overview.knowledge_chunks)}</strong><span>chunks</span></div>
            </div>
            <p className={styles.note}>
              Última ingestão: {overview.last_knowledge_update_at ? new Date(overview.last_knowledge_update_at).toLocaleString("pt-BR") : "nenhuma"}.
            </p>
          </section>
        </div>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Configurações operacionais</h2>
              <p>Aplicadas aos próximos turnos. Chaves e URLs ficam fora do painel.</p>
            </div>
            <span className={governance.uses_runtime_override ? styles.override : styles.deploy}>
              {governance.uses_runtime_override ? "override ativo" : "valor do deploy"}
            </span>
          </header>
          <form action={updateMindGovernanceAction} className={styles.settingsForm}>
            <NumberField label="tokens máx. por resposta" name="diagnosis_max_output_tokens" value={governance.diagnosis_max_output_tokens} min={128} max={4096} />
            <NumberField label="mensagens no histórico" name="diagnosis_max_history_messages" value={governance.diagnosis_max_history_messages} min={2} max={50} />
            <NumberField label="turnos por sessão" name="diagnosis_max_turns" value={governance.diagnosis_max_turns} min={1} max={100} />
            <NumberField label="chunks por busca" name="diagnosis_grounding_top_k" value={governance.diagnosis_grounding_top_k} min={1} max={10} />
            <NumberField label="score mínimo" name="diagnosis_grounding_min_score" value={governance.diagnosis_grounding_min_score} min={0} max={1} step="0.05" />
            <div className={styles.settingsMeta}>
              <span>LLM: {governance.maritaca_model}</span>
              <span>embeddings: {governance.embeddings_model_name}</span>
            </div>
            <div className={styles.settingsAction}><Button variant="solid">Salvar configurações</Button></div>
          </form>
        </section>

        <section className={styles.panel}>
          <header className={styles.panelHeader}>
            <div>
              <h2>Orçamento mensal por fluxo</h2>
              <p>Bloqueia uma chamada antes que seu pior caso ultrapasse o teto.</p>
            </div>
            <span className={styles.privatePill}>{usage.month}</span>
          </header>
          <div className={styles.budgetTable}>
            <div className={styles.budgetHead}>
              <span>fluxo</span><span>custo no mês</span><span>tokens cacheados</span><span>teto mensal</span>
            </div>
            {mindBudgetFlows.map((flow) => {
              const current = usageByFlow.get(flow);
              const budget = budgetByFlow.get(flow);
              return (
                <form action={updateMindBudgetAction.bind(null, flow)} className={styles.budgetRow} key={flow}>
                  <span>{flow}</span>
                  <span>{current ? formatCurrency(current.estimated_cost_brl) : formatCurrency(0)}</span>
                  <span>{formatNumber(current?.cached_input_tokens ?? 0)}</span>
                  <label><input name="monthly_budget_brl" type="number" defaultValue={budget?.monthly_budget_brl ?? ""} min="0.01" step="0.01" placeholder="não definido" required /><Button variant="outline">Salvar</Button></label>
                </form>
              );
            })}
          </div>
          <p className={styles.note}>Sem teto definido, o fluxo apenas registra custo e tokens.</p>
        </section>
      </div>
  );
}

function Metric({ label, value, hint, warning = false }: { label: string; value: string; hint: string; warning?: boolean }) {
  return <div className={`${styles.tile} ${warning ? styles.tileWarning : ""}`}><span>{label}</span><strong>{value}</strong><small>{hint}</small></div>;
}

function Empty({ text }: { text: string }) {
  return <div className={styles.empty}>{text}</div>;
}

function NumberField({ label, name, value, min, max, step = "1" }: { label: string; name: string; value: number; min: number; max: number; step?: string }) {
  return <label className={styles.field}><span>{label}</span><input name={name} type="number" defaultValue={value} min={min} max={max} step={step} required /></label>;
}
