import Link from "next/link";
import styles from "./Button.module.scss";

type Variant = "solid" | "outline" | "danger";
/** `md` = page action (default), `sm` = list-header action, `row` = in-table action. */
type Size = "md" | "sm" | "row";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({
  variant = "solid",
  size = "md",
  href,
  className,
  ...rest
}: ButtonProps) {
  const classes = `${styles[variant]} ${size !== "md" ? styles[size] : ""} ${className ?? ""}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {rest.children}
      </Link>
    );
  }

  return <button className={classes} {...rest} />;
}
