import type { BadgeTone } from "@/lib/admin/format";
import styles from "./Badge.module.scss";

type BadgeProps = {
  tone?: BadgeTone;
  /** `sm` = list rows (2px 8px), `md` = detail headers (3px 9px). */
  size?: "sm" | "md";
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLSpanElement>;

export default function Badge({
  tone = "neutral",
  size = "sm",
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={`${styles.badge} ${styles[tone]} ${styles[size]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </span>
  );
}
