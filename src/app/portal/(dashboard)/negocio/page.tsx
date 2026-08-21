import { listCatalogEntries } from "@/lib/portal/services/catalog";
import CatalogClient from "./CatalogClient";

export default async function PortalCatalogPage() {
  const entries = await listCatalogEntries();
  return <CatalogClient entries={entries} />;
}
