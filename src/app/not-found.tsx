import type { Metadata } from "next";
import SiteShell from "@/components/SiteShell/SiteShell";
import NotFoundView from "@/components/NotFoundView/NotFoundView";

export const metadata: Metadata = {
  title: "Página não encontrada",
  description: "O endereço mudou ou nunca existiu.",
};

// Fica fora dos route groups: cobre URL sem rota e o notFound() de /cases/[slug],
// por isso traz o próprio SiteShell (nav + footer + painel de diagnóstico).
export default function NotFound() {
  return (
    <SiteShell>
      <NotFoundView />
    </SiteShell>
  );
}
