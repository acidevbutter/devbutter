import SiteShell from "@/components/SiteShell/SiteShell";

export default function SiteLayout({ children }: LayoutProps<"/">) {
  return <SiteShell>{children}</SiteShell>;
}
