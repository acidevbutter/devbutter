import Link from "next/link";
import SiteShell from "@/components/SiteShell/SiteShell";

export default function NotFound() {
  return (
    <SiteShell>
      <section style={{ padding: "64px 4vw", textAlign: "center" }}>
        <h1>Essa página saiu de órbita.</h1>
        <Link href="/">Voltar para a home</Link>
      </section>
    </SiteShell>
  );
}
