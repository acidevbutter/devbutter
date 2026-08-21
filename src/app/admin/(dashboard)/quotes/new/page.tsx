import { listClients } from "@/lib/admin/services/clients";
import NewQuoteForm from "./NewQuoteForm";

export default async function AdminNewQuotePage() {
  const clients = await listClients();
  return <NewQuoteForm clients={clients} />;
}
