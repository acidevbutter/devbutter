import styles from "./Card.module.scss";

export default function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={`${styles.card} ${className ?? ""}`}>{children}</div>;
}

export function Label({ children }: { children: React.ReactNode }) {
  return <div className={styles.label}>{children}</div>;
}
