import styles from "./Maintenance.module.scss";

const FLASK_PATH =
  "M84 30h32v46l40 96a18 18 0 0 1-16.7 24.7H60.7A18 18 0 0 1 44 172l40-96V30z";

/**
 * The flat logomark flask. It ships in the HTML and carries the stage on its own, so the
 * WebGL scene is a pure upgrade — this stays put whenever 3D can't run.
 */
export default function FlaskSvg() {
  return (
    <svg className={styles.flaskSvg} viewBox="0 0 200 240" aria-hidden="true">
      <defs>
        <clipPath id="maintenance-flask-clip">
          <path d={FLASK_PATH} />
        </clipPath>
      </defs>
      <path d={FLASK_PATH} fill="rgba(245,247,251,.05)" stroke="#f5f7fb" strokeWidth={2.4} />
      <rect
        x="34"
        y="134"
        width="132"
        height="78"
        fill="#79E59B"
        clipPath="url(#maintenance-flask-clip)"
        className={styles.flaskLiquidTop}
      />
      <rect
        x="34"
        y="162"
        width="132"
        height="50"
        fill="#F64C6F"
        clipPath="url(#maintenance-flask-clip)"
        className={styles.flaskLiquidBottom}
      />
      <path
        d="M92 52l-1.6 2 1.6 2M108 52l1.6 2-1.6 2"
        stroke="#00D26A"
        strokeWidth={1.7}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="80" y="24" width="40" height="8" rx="2" fill="#0b0f18" stroke="#f5f7fb" strokeWidth={2} />
      <g>
        <circle cx="98" cy="20" r="2.6" fill="#79E59B" className={styles.bubble} />
        <circle cx="106" cy="18" r="2" fill="#F64C6F" className={styles.bubble} style={{ animationDuration: "2.8s", animationDelay: ".6s" }} />
        <circle cx="92" cy="16" r="1.6" fill="#79E59B" className={styles.bubble} style={{ animationDuration: "2.2s", animationDelay: "1.1s" }} />
      </g>
      <g>
        <ellipse cx="128" cy="96" rx="2.2" ry="3.4" fill="#79E59B" className={styles.drip} />
        <ellipse cx="74" cy="112" rx="1.8" ry="3" fill="#F64C6F" className={styles.drip} style={{ animationDuration: "4.2s", animationDelay: "1.3s" }} />
      </g>
    </svg>
  );
}
