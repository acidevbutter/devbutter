import "server-only";
import { AdminUnauthenticatedError } from "../api";
import { formatCurrency } from "../format";
import type { AdminSearchGroup, AdminSearchResponse } from "../search";
import { listClients } from "./clients";
import { listCompanies } from "./companies";
import { listInvoices } from "./invoices";
import { listOrders } from "./orders";
import { listAllQuotesForTable } from "./quotes";

const PER_GROUP = 5;

function contains(haystack: string | null | undefined, needle: string): boolean {
  return (haystack ?? "").toLowerCase().includes(needle);
}

// Swallow per-endpoint failures so one broken list doesn't kill the whole
// search — but let an auth failure propagate, so the route can answer 401.
function tolerate<T>(promise: Promise<T[]>): Promise<T[]> {
  return promise.catch((err) => {
    if (err instanceof AdminUnauthenticatedError) throw err;
    return [];
  });
}

// Fans out across the admin list endpoints and merges the hits. There is no
// dedicated backend search route yet (see docs/prompts/admin-global-search-backend.md);
// /admin/clients and /admin/companies filter server-side, the rest are filtered here.
export async function runAdminSearch(rawQuery: string): Promise<AdminSearchResponse> {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) return { groups: [] };

  const [clients, companies, orders, invoices, quotes] = await Promise.all([
    tolerate(listClients(rawQuery)),
    tolerate(listCompanies(rawQuery)),
    tolerate(listOrders()),
    tolerate(listInvoices()),
    tolerate(listAllQuotesForTable()),
  ]);

  const groups: AdminSearchGroup[] = [];

  const clientItems = clients.slice(0, PER_GROUP).map((c) => ({
    label: c.name,
    sub: c.email,
    href: `/admin/clients/${c.id}`,
  }));
  if (clientItems.length) groups.push({ group: "Clientes", items: clientItems });

  const companyItems = companies.slice(0, PER_GROUP).map((c) => ({
    label: c.name,
    sub: [c.owner_name, c.cnpj].filter(Boolean).join(" · "),
    href: `/admin/companies/${c.id}`,
  }));
  if (companyItems.length) groups.push({ group: "Empresas", items: companyItems });

  const orderItems = orders
    .filter((o) => contains(o.account_name, q) || contains(o.id, q))
    .slice(0, PER_GROUP)
    .map((o) => ({
      label: o.account_name,
      sub: `#${o.id.slice(0, 8)} · ${o.status}`,
      href: `/admin/orders/${o.id}`,
    }));
  if (orderItems.length) groups.push({ group: "Orders", items: orderItems });

  const invoiceItems = invoices
    .filter((i) => contains(i.account_name, q) || contains(i.asaas_invoice_id, q))
    .slice(0, PER_GROUP)
    .map((i) => ({
      label: i.account_name,
      sub: `${formatCurrency(i.amount)} · ${i.status.toLowerCase()}`,
      href: `/admin/invoices`,
    }));
  if (invoiceItems.length) groups.push({ group: "Invoices", items: invoiceItems });

  const quoteItems = quotes
    .filter((qt) => contains(qt.scope_summary, q))
    .slice(0, PER_GROUP)
    .map((qt) => ({
      label: qt.scope_summary.slice(0, 60) || "orçamento sem resumo",
      sub: `${qt.source} · ${qt.status}`,
      href: `/admin/quotes/${qt.id}`,
    }));
  if (quoteItems.length) groups.push({ group: "Quotes", items: quoteItems });

  return { groups };
}
