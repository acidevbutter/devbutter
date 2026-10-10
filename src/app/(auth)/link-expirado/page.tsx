import type { Metadata } from "next";
import ExpiredLink from "@/components/auth/ExpiredLink";

export const metadata: Metadata = {
  title: "Link expirado",
  description: "Links de senha valem 30 minutos e funcionam uma vez só — peça um novo.",
};

export default function ExpiredLinkPage() {
  return <ExpiredLink />;
}
