"use client";

import { useEffect, useState } from "react";
import ConciergeCta from "@/components/ConciergeCta/ConciergeCta";
import useRevealOnce from "@/hooks/useRevealOnce";
import styles from "./Concierge.module.scss";

const STEPS = [
  { num: "01", content: <>Captura de leads via formulário ou <span className="gn">WhatsApp</span></> },
  { num: "02", content: <>Classificação automática com <span className="gn">IA</span></> },
  { num: "03", content: <>Respostas <span className="pk">personalizadas</span></> },
  { num: "04", content: <>Integração com <span className="pk">CRM</span></> },
  { num: "05", content: <>Relatórios e métricas</> },
];

export default function Concierge() {
  // The terminal streams its suggested flow in once it's on screen, one step at a
  // time, with the caret blinking until the last step lands.
  const [terminalRef, started] = useRevealOnce<HTMLDivElement>(0.3);
  const [streamed, setStreamed] = useState(0);

  useEffect(() => {
    if (!started) return;
    // Under reduced motion the steps are already visible via CSS; the counter still
    // runs to completion so the caret retires when the flow is "done".
    let n = 0;
    let timer = 0;
    const tick = () => {
      n += 1;
      setStreamed(n);
      if (n < STEPS.length) timer = window.setTimeout(tick, 420);
    };
    timer = window.setTimeout(tick, 320);
    return () => window.clearTimeout(timer);
  }, [started]);

  const streaming = streamed < STEPS.length;

  return (
    <section className={styles.section}>
      <div>
        <div className={`mono gn ${styles.eyebrow}`}>Concierge IA</div>
        <h2 className={styles.h2}>
          Converse com a <span className="gn">IA</span> da DevButter.
        </h2>
        <p className={styles.desc}>
          Nossa IA entende seu contexto, responde sobre a DevButter e guia você pelos projetos
          certos — sem executar código arbitrário, só ações validadas.
        </p>
      </div>

      <div className={styles.panel}>
        <div className={styles.userBubble}>
          Quero automatizar o atendimento de leads do meu site.
        </div>

        <div className={styles.terminal}>
          <div className={styles.terminalHead}>
            <span className={`mono ${styles.terminalLabel}`}>
              ❯ <span className="gn">IA</span> · concierge
            </span>
            <span className={`mono ${styles.terminalStatus}`}>
              <span className={styles.statusDot} />
              Concluído
            </span>
          </div>
          <div ref={terminalRef} className={styles.terminalBody}>
            <div className={`mono gn ${styles.flowLabel}`}>
              Fluxo sugerido{" "}
              {streaming && <span className={styles.caret}>▮</span>}
            </div>
            <div className={styles.steps} aria-live="polite">
              {STEPS.map((s, i) => (
                <div
                  key={s.num}
                  className={`${styles.step} ${i < streamed ? styles.stepIn : ""}`}
                >
                  <span className={`mono ${styles.stepNum}`}>{s.num}</span>
                  {s.content}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.chips}>
          <button className={`${styles.chip} ${styles.chipGreen}`}>
            <svg width="13" height="13" fill="none" stroke="#79E59B" strokeWidth={1.6}>
              <path d="M2 6.5h9M8 3l3.5 3.5L8 10" />
            </svg>
            Ver fluxo de automação
          </button>
          <button className={`${styles.chip} ${styles.chipPink}`}>
            <svg width="13" height="13" fill="none" stroke="#F64C6F" strokeWidth={1.6}>
              <circle cx="6.5" cy="6.5" r="4.5" />
            </svg>
            Explorar integrações
          </button>
          <ConciergeCta className={`${styles.chip} ${styles.chipNeutral}`}>
            Estimar escopo
          </ConciergeCta>
        </div>
      </div>
    </section>
  );
}
