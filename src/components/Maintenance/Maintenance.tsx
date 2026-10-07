import SceneCanvas from "@/components/Scenes/SceneCanvas";
import StreamingText, {
  PER_WORD_MS,
  countWords,
} from "@/components/StreamingText/StreamingText";
import Logomark from "@/components/icons/Logomark";
import NotifyForm from "./NotifyForm";
import StatusLog from "./StatusLog";
import { MAINTENANCE_COPY, SUPPORT_LINE, type MaintenanceVariant } from "./copy";
import styles from "./Maintenance.module.scss";

const TAGS = [
  { label: "Sites e plataformas", variant: "green" },
  { label: "Agentes de IA", variant: "pink" },
  { label: "Automações e integrações", variant: "" },
  { label: "Sistemas internos e dashboards", variant: "" },
];

export default function Maintenance({
  variant = "reconstrucao",
}: {
  variant?: MaintenanceVariant;
}) {
  const copy = MAINTENANCE_COPY[variant];

  // Each block starts as the one before it finishes, so the page reads like a single
  // response being written. Derived from the copy itself rather than hardcoded, so
  // rewording a paragraph can't desynchronise the sequence.
  const headline = `${copy.headline.lead} ${copy.headline.prefix}${copy.headline.suffix}`;
  const headlineStart = 140;
  const introStart = headlineStart + countWords(headline) * PER_WORD_MS + 140;
  const reassuranceStart =
    introStart + countWords(copy.intro) * PER_WORD_MS + 80;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.brand}>
          <Logomark />
          <span className={styles.brandName}>
            Dev<span className="gn">Butter</span>
          </span>
        </div>
        <span className={`mono ${styles.statusPill}`}>
          <span className={styles.statusDot} />
          {copy.status}
        </span>
      </header>

      <main className={styles.main}>
        <div>
          <div className={`fu mono ${styles.eyebrow}`}>
            Estúdio de tecnologia · <span className="pk">engenharia aplicada a problemas reais</span>
          </div>

          <h1 className={styles.h1}>
            <StreamingText startMs={headlineStart}>
              <span className={styles.h1Line1}>{copy.headline.lead}</span>
              <span className={styles.h1Line2}>
                {copy.headline.prefix}
                <span className="pk">{copy.headline.suffix}</span>.
              </span>
            </StreamingText>
          </h1>

          <p className={styles.paragraph}>
            <StreamingText startMs={introStart}>{copy.intro}</StreamingText>
          </p>
          <p className={`${styles.paragraph} ${styles.paragraphSecond}`}>
            <StreamingText startMs={reassuranceStart} caret>
              <span className={styles.strong}>{copy.reassurance}</span> {SUPPORT_LINE}
            </StreamingText>
          </p>

          <div className={`fu ${styles.tags}`}>
            {TAGS.map((tag) => (
              <span
                key={tag.label}
                className={`mono ${styles.tag} ${
                  tag.variant === "green"
                    ? styles.tagGreen
                    : tag.variant === "pink"
                      ? styles.tagPink
                      : ""
                }`}
              >
                {tag.label}
              </span>
            ))}
          </div>

          <NotifyForm label={copy.notifyLabel} />

          <div className={`fu ${styles.contact}`}>
            <div>
              <div className={`mono ${styles.contactLabel}`}>solicitar diagnóstico</div>
              <a className={styles.contactLink} href="mailto:contato@devbutter.com">
                contato@devbutter.com
              </a>
            </div>
            <div className={styles.contactDivider} />
            <div>
              <div className={`mono ${styles.contactLabel}`}>conversa direta</div>
              <a className={`${styles.contactLink} ${styles.contactLinkPink}`} href="#">
                WhatsApp
              </a>
            </div>
            <div className={styles.contactDivider} />
            <div>
              <div className={`mono ${styles.contactLabel}`}>onde mais nos encontrar</div>
              <a className={styles.contactLink} href="#">
                GitHub · LinkedIn
              </a>
            </div>
          </div>
        </div>

        <div className={styles.stage}>
          <div className={styles.stageGlow} aria-hidden="true" />

          {/* the c7 "distillation" scene of the design: the flask is the logo */}
          <div className={styles.scene}>
            <SceneCanvas kind="distill" />
          </div>

          <div className={styles.logCard}>
            <div className={styles.logHeader}>
              <span className={`mono ${styles.logTitle}`}>
                ❯ <span className="gn">devbutter</span> · status do projeto
              </span>
              <span className={`mono ${styles.logBadge}`}>
                <span className={styles.logBadgeDot} />
                em andamento
              </span>
            </div>
            <StatusLog rows={copy.log} />
          </div>
        </div>
      </main>

      <div className={styles.terrain} aria-hidden="true" />

      <footer className={styles.footer}>
        <span>
          dev<span className="gn">Butter</span> — engenharia aplicada a problemas reais.
        </span>
        <span className={`mono ${styles.footerNote}`}>{copy.status} · atendimento normal</span>
      </footer>
    </div>
  );
}
