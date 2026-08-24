import { notFound } from "next/navigation";
import { getCompany, listFeatures } from "@/lib/admin/services/companies";
import { AdminApiError } from "@/lib/admin/api";
import CompanyDetailClient from "./CompanyDetailClient";

export default async function AdminCompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let company;
  try {
    company = await getCompany(id);
  } catch (err) {
    if (err instanceof AdminApiError && err.status === 404) notFound();
    throw err;
  }

  const features = await listFeatures(id);

  return <CompanyDetailClient company={company} features={features} />;
}
