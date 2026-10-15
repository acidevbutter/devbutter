import type { Metadata } from "next";
import AuthShell from "@/components/AuthShell/AuthShell";

export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return <AuthShell>{children}</AuthShell>;
}
