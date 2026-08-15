import type { Metadata } from "next";
import Maintenance from "@/components/Maintenance/Maintenance";
import { MAINTENANCE_COPY, resolveVariant } from "@/components/Maintenance/copy";

const variant = resolveVariant(process.env.MAINTENANCE_VARIANT);
const copy = MAINTENANCE_COPY[variant];

export const metadata: Metadata = {
  title: copy.metaTitle,
  description: copy.metaDescription,
  alternates: { canonical: "/" },
};

export default function ManutencaoPage() {
  return <Maintenance variant={variant} />;
}
