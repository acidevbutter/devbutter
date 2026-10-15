import type { AnchorHTMLAttributes } from "react";

/** Stand-in for next/link inside the compiled package: a plain anchor. */
export default function Link({ href, children, ...rest }: { href: string } & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}
