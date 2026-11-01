import type { Metadata, Viewport } from "next";
import { getContent } from "@/lib/server-content";
import { AUTHOR, SITE_NAME, seoTitle, siteOrigin } from "@/lib/seo";
import { connection } from "next/server";
import MotionProvider from "@/components/motion-provider";
import "@fontsource-variable/onest";
import "lenis/dist/lenis.css";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  await connection();
  const { settings } = await getContent();
  return {
  metadataBase: new URL(siteOrigin()),
  title: { default: seoTitle(settings), template: "%s — ROMAN KOSKIN" },
  description: settings.seoDescription,
  applicationName: SITE_NAME,
  authors: [{ name: AUTHOR, url: siteOrigin() }],
  creator: AUTHOR,
  openGraph: { title: seoTitle(settings), description: settings.seoDescription, siteName: SITE_NAME, locale: "ru_RU", type: "website", images: [{ url: "/images/roman-koskin-og.png", width: 1200, height: 630, alt: "Роман Коськин — графика, брендинг, пространство" }] },
  twitter: { card: "summary_large_image", images: ["/images/roman-koskin-og.png"] },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
  verification: { google: process.env.GOOGLE_SITE_VERIFICATION || undefined, yandex: process.env.YANDEX_SITE_VERIFICATION || undefined },
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#f8f7f4" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body><a className="skip-link" href="#main">Перейти к содержимому</a><MotionProvider>{children}</MotionProvider></body></html>;
}
