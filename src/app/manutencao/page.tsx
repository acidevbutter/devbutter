import type { Metadata } from "next";
import Maintenance from "@/components/Maintenance/Maintenance";

export const metadata: Metadata = {
  title: "DevButter — site em reconstrução",
  description:
    "Estamos refazendo o site da DevButter. Os projetos seguem em andamento e o atendimento continua normal — fale com a gente por contato@devbutter.com.",
  alternates: { canonical: "/" },
};

export default function ManutencaoPage() {
  return <Maintenance />;
}
