import type { Metadata } from "next";
import type { Settings } from "./content";

export const AUTHOR = "Роман Коськин";
export const SITE_NAME = "ROMAN KOSKIN";
export const DEFAULT_SEO_TITLE = "Роман Коськин — графический дизайнер | ROMAN KOSKIN";
export const DEFAULT_SEO_DESCRIPTION = "Портфолио Романа Коськина: графический дизайн, логотипы и фирменный стиль, афиши, интерьеры и архитектура. Подольск, Москва. Обсудите ваш проект с автором.";

// The platform's PUBLIC_SITE_URL can remain its technical subdomain.
// Search metadata always uses the separately configured primary domain.
export function siteOrigin(): string {
  const url = new URL(process.env.SEO_SITE_URL || "https://romankoskin.art");
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("SEO_SITE_URL must be an absolute origin, e.g. https://romankoskin.art");
  }
  return url.origin;
}

export function siteUrl(path = "/"): string {
  // Never allow a content field to replace the trusted primary origin.
  return siteOrigin() + (path.startsWith("/") ? path : `/${path}`);
}

export function seoTitle(settings: Settings) {
  return settings.seoTitle === "ROMAN KOSKIN — Дизайнер" ? DEFAULT_SEO_TITLE : settings.seoTitle;
}

export function pageMetadata({ title, description, path, image = "/images/roman-koskin-og.png" }: { title: string; description: string; path: string; image?: string }): Metadata {
  const url = siteUrl(path);
  const images = [{ url: siteUrl(image), alt: `${title} — портфолио Романа Коськина` }];
  return {
    title: { absolute: title }, description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, locale: "ru_RU", type: "website", images },
    twitter: { card: "summary_large_image", title, description, images },
  };
}
