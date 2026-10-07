import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.scss";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://devbutter.tech";
const DEFAULT_TITLE = "DevButter — Engenharia aplicada a problemas reais";
const DEFAULT_DESCRIPTION =
  "Sites, plataformas, agentes e automações. A tecnologia certa depende do problema, não o contrário — a gente entende a operação antes de falar de stack.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: "%s · DevButter" },
  description: DEFAULT_DESCRIPTION,
  applicationName: "DevButter",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "DevButter",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
