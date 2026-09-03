import { listKnowledgeEntries } from "@/lib/admin/services/knowledge";
import KnowledgeClient from "./KnowledgeClient";
import styles from "@/styles/AdminList.module.scss";

export default async function AdminKnowledgePage() {
  const entries = await listKnowledgeEntries();
  return (
    <div className={styles.page}>
      <div className={styles.countBar}>
        <span>Conhecimento / precificação</span>
        <span className={styles.countBarValue}>alimenta as sugestões da IA</span>
      </div>
      <KnowledgeClient entries={entries} />
    </div>
  );
}
