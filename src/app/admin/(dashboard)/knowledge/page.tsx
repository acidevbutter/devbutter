import { listKnowledgeEntries } from "@/lib/admin/services/knowledge";
import KnowledgeClient from "./KnowledgeClient";

export default async function AdminKnowledgePage() {
  const entries = await listKnowledgeEntries();
  return <KnowledgeClient entries={entries} />;
}
