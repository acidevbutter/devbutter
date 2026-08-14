"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Logomark from "@/components/icons/Logomark";
import styles from "./ChatSimulation.module.scss";

type Role = "user" | "ai" | "result";

type Message = {
  role: Role;
  content: React.ReactNode;
};

const MESSAGES: Message[] = [
  {
    role: "user",
    content: "Meu time gasta horas todo dia respondendo as mesmas perguntas de clientes.",
  },
  {
    role: "ai",
    content: (
      <>
        Isso é automatizável. Um agente treinado no <span className="gn">seu contexto</span>{" "}
        responde na hora — e passa para uma pessoa só quando realmente precisa.
      </>
    ),
  },
  {
    role: "user",
    content: "E os leads que chegam pelo site e pelo WhatsApp?",
  },
  {
    role: "ai",
    content: (
      <>
        Eu cuido do fluxo inteiro:
        <div className={styles.flowList}>
          <div className={styles.flowItem}>
            <span className={`gn mono ${styles.arrow}`}>→</span>Qualificação automática do lead
          </div>
          <div className={styles.flowItem}>
            <span className={`gn mono ${styles.arrow}`}>→</span>Resposta personalizada na hora
          </div>
          <div className={styles.flowItem}>
            <span className={`pk mono ${styles.arrow}`}>→</span>Registro direto no{" "}
            <span className="pk">CRM</span>
          </div>
        </div>
      </>
    ),
  },
  {
    role: "result",
    content: (
      <>
        <span className="pk" style={{ fontWeight: 600 }}>
          Resultado:
        </span>{" "}
        seu time para de apagar incêndio e foca no que gera receita.
      </>
    ),
  },
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export default function ChatSimulation() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startedRef = useRef(false);
  const cancelledRef = useRef(false);

  const [revealed, setRevealed] = useState<boolean[]>(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? MESSAGES.map(() => true)
      : MESSAGES.map(() => false)
  );
  const [typingIndex, setTypingIndex] = useState<number | null>(null);
  const [typingShown, setTypingShown] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const reveal = (index: number) =>
      setRevealed((prev) => {
        const next = [...prev];
        next[index] = true;
        return next;
      });

    const run = async () => {
      for (let i = 0; i < MESSAGES.length; i++) {
        if (cancelledRef.current) return;
        const isAi = MESSAGES[i].role !== "user";
        if (isAi) {
          setTypingIndex(i);
          await new Promise<void>((r) => requestAnimationFrame(() => r()));
          setTypingShown(true);
          await wait(950);
          if (cancelledRef.current) return;
          setTypingShown(false);
          await wait(180);
          if (cancelledRef.current) return;
          setTypingIndex(null);
        } else {
          await wait(440);
        }
        if (cancelledRef.current) return;
        reveal(i);
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !startedRef.current) {
            startedRef.current = true;
            run();
            io.disconnect();
          }
        });
      },
      { threshold: 0.3 }
    );

    io.observe(el);

    return () => {
      cancelledRef.current = true;
      io.disconnect();
    };
  }, []);

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <div className={`mono gn ${styles.eyebrow}`}>Na prática</div>
        <h2 className={styles.h2}>
          Como a <span className="gn">DevButter</span> ajuda sua <span className="pk">empresa</span>.
        </h2>
        <p className={styles.subtext}>
          Uma conversa real — do problema do dia a dia à solução que trabalha junto com o time.
        </p>
      </div>

      <div className={styles.window}>
        <div className={styles.windowHeader}>
          <Logomark width={22} height={26} />
          <div>
            <div className={styles.windowTitle}>DevButter IA</div>
            <div className={`mono ${styles.windowStatus}`}>
              <span className={styles.statusDot} />
              online · responde na hora
            </div>
          </div>
        </div>

        <div ref={containerRef} className={styles.messages}>
          {MESSAGES.map((m, i) => (
            <Fragment key={i}>
              {typingIndex === i && (
                <div
                  className={`${styles.typing} ${styles.typingVisible} ${
                    typingShown ? styles.typingShown : ""
                  }`}
                >
                  <span className={styles.typingDot} style={{ animationDelay: "0s" }} />
                  <span className={styles.typingDot} style={{ animationDelay: ".2s" }} />
                  <span className={styles.typingDot} style={{ animationDelay: ".4s" }} />
                </div>
              )}
              <div
                className={[
                  styles.bubble,
                  m.role === "user" ? styles.bubbleUser : m.role === "ai" ? styles.bubbleAi : styles.bubbleResult,
                  revealed[i] ? styles.bubbleVisible : "",
                ].join(" ")}
              >
                {m.content}
              </div>
            </Fragment>
          ))}
        </div>

        <div className={styles.chips}>
          <button className={`${styles.chip} ${styles.chipGreen}`}>Ver como funciona</button>
          <button className={`${styles.chip} ${styles.chipPink}`}>Solicitar diagnóstico</button>
        </div>
      </div>
    </section>
  );
}
