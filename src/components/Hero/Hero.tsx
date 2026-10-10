import Link from "next/link";
import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import SiteCurvature from "@/components/SiteScene/SiteCurvature";
import styles from "./Hero.module.scss";

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.grid}>
        <div className={styles.copy}>
          <div className={styles.eyebrow}>Sites · plataformas · agentes · automações</div>
          <h1 className={styles.h1}>
            <span className={styles.h1Line1}>Engenharia aplicada</span>
            <span className={styles.h1Line2}>a problemas reais.</span>
          </h1>
          <p className={styles.paragraph}>
            A tecnologia certa depende do problema, não o contrário. A gente entende a operação
            antes de falar de stack.
          </p>
          <div className={styles.ctas}>
            <ConciergeCta className={styles.ctaPrimary}>Solicitar diagnóstico</ConciergeCta>
            <Link href="/cases" className={styles.ctaSecondary}>
              Ver cases
            </Link>
          </div>
        </div>

        <div className={styles.stage}>
          <SiteCurvature label="Malha de curvatura 3D: uma massa rosa deforma a malha verde; arraste a massa para mover o problema" />
          <div className={styles.shade} aria-hidden="true" />
          <div className={styles.hint} aria-hidden="true">
            <span className={styles.hintDot} />
            arraste a massa
          </div>
          <div className={styles.legend} aria-hidden="true">
            <span>
              <span className={styles.pink}>●</span> a massa é o problema ·{" "}
              <span className={styles.green}>—</span> a malha é a solução se ajustando a ele
            </span>
            <span>
              <span className={styles.pinkGlow}>⟶</span>
              <span className={styles.green}>⟶</span> até a luz se curva em volta dele
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
