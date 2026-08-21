import "server-only";
import { listOrderContexts, type PortalOrderContext } from "./orders";
import type { PortalProject } from "../types";

export async function listProjects(): Promise<PortalProject[]> {
  const contexts = await listOrderContexts();
  return contexts.map(toPortalProject);
}

export async function getProject(id: string): Promise<PortalProject | null> {
  const contexts = await listOrderContexts();
  const context = contexts.find(({ order }) => order.id === id);
  return context ? toPortalProject(context) : null;
}

function toPortalProject({ order, quote, invoices }: PortalOrderContext): PortalProject {
  const status = order.status as PortalProject["status"];
  const statusLabel: Record<PortalProject["status"], string> = {
    created: "Aguardando pagamento",
    invoiced: "Em desenvolvimento",
    completed: "Concluído",
    cancelled: "Cancelado",
  };
  const progressPct: Record<PortalProject["status"], number> = {
    created: 25,
    invoiced: 60,
    completed: 100,
    cancelled: 0,
  };
  const dueDate = invoices.reduce<string | null>(
    (latest, invoice) => (!latest || invoice.due_date > latest ? invoice.due_date : latest),
    null
  );

  return {
    id: order.id,
    title: quote.scope_summary,
    status,
    statusLabel: statusLabel[status],
    progressPct: progressPct[status],
    steps: [
      { label: "Orçamento aprovado", done: true, current: status === "created" },
      { label: "Pagamento confirmado", done: status !== "created", current: status === "invoiced" },
      { label: "Em desenvolvimento", done: status === "completed", current: status === "invoiced" },
      { label: "Entrega", done: status === "completed", current: status === "completed" },
    ],
    startDate: order.created_at,
    dueDate: dueDate ?? order.created_at,
    scopeItems: [quote.scope_summary],
    quoteId: quote.id,
    latestUpdate: null,
  };
}
