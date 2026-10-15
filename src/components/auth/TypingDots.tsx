import styles from "./TypingDots.module.scss";

/** The chat's "digitando" bubble, reused as the sending indicator. Decorative. */
export default function TypingDots() {
  return (
    <span className={styles.dots} aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <i key={i} className={styles.dot} style={{ animationDelay: `${i * 0.2}s` }} />
      ))}
    </span>
  );
}
