import Link from "next/link";
import SiteCurvature from "@/components/SiteScene/SiteCurvature";
import { NF_CURV } from "@/components/Curvature3D/scenes";
import styles from "./NotFoundView.module.scss";

export default function NotFoundView() {
  return (
    <section className={styles.section}>
      <div className={styles.stage}>
        <SiteCurvature
          options={NF_CURV}
          label="Duas massas curvando a malha — uma delas em órbita"
        />
        <div className={styles.shade} aria-hidden="true" />
      </div>
      <div className={styles.code}>404</div>
      <h1 className={styles.title}>Essa página saiu de órbita.</h1>
      <p className={styles.text}>
        O endereço mudou ou nunca existiu. Dá pra voltar ao começo ou ver o que a gente já resolveu.
      </p>
      <div className={styles.actions}>
        <Link href="/" className={styles.primary}>
          Voltar para a home
        </Link>
        <Link href="/cases" className={styles.secondary}>
          Ver cases
        </Link>
      </div>
    </section>
  );
}
