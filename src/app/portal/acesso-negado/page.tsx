import SessionCard from "@/components/portal/SessionCard/SessionCard";

export const metadata = { title: "Acesso negado · DevButter" };

export default function PortalForbiddenPage() {
  return (
    <SessionCard
      title="Você não tem acesso a este conteúdo"
      body="Esta página pertence a outra conta ou não está disponível para o seu perfil."
      ctaLabel="Voltar para o início"
      ctaHref="/portal"
    />
  );
}
