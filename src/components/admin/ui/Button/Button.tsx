import Link from "next/link";
import styles from "./Button.module.scss";

type Variant = "solid" | "outline" | "danger";

type ButtonProps = {
  variant?: Variant;
  href?: string;
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function Button({ variant = "solid", href, className, ...rest }: ButtonProps) {
  const classes = `${styles[variant]} ${className ?? ""}`;

  if (href) {
    return (
      <Link href={href} className={classes}>
        {rest.children}
      </Link>
    );
  }

  return <button className={classes} {...rest} />;
}
