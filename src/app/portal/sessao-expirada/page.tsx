import SessionCard from "@/components/portal/SessionCard/SessionCard";

export const metadata = { title: "Sessão expirada · DevButter" };

export default function PortalSessionExpiredPage() {
  return (
    <SessionCard
      title="Sua sessão expirou"
      body="Por segurança, encerramos seu acesso após um período de inatividade. Entre novamente para continuar de onde parou."
      ctaLabel="Entrar novamente"
      ctaHref="/portal/login"
    />
  );
}
