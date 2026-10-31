import type { Metadata, Viewport } from "next";
import { getContent } from "@/lib/server-content";
import { connection } from "next/server";
import MotionProvider from "@/components/motion-provider";
import "@fontsource-variable/onest";
import "lenis/dist/lenis.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { settings } = await getContent();
  return {
  metadataBase: new URL(process.env.PUBLIC_SITE_URL || "http://localhost:3000"),
  title: { default: settings.seoTitle, template: "%s — ROMAN KOSKIN" },
  description: settings.seoDescription,
  openGraph: { title: settings.seoTitle, description: settings.seoDescription, locale: "ru_RU", type: "website", images: [{ url: "/images/roman.png", width: 958, height: 1278 }] },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true }
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f2f0e9" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><a className="skip-link" href="#main">Перейти к содержимому</a><MotionProvider>{children}</MotionProvider></body></html>;
}
