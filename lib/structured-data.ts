import type { SiteContent, ManagedProject } from "./content";
import { AUTHOR, SITE_NAME, siteUrl } from "./seo";

export function homeStructuredData(content: SiteContent) {
  const { settings, projects } = content;
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Person", "@id": siteUrl("/#person"), name: AUTHOR, alternateName: "Roman Koskin", url: siteUrl(), image: siteUrl("/images/roman.png"), jobTitle: "Графический дизайнер", description: settings.about, email: settings.email, telephone: settings.phone, sameAs: [settings.telegram], knowsAbout: ["Графический дизайн", "Брендинг", "Дизайн интерьеров", "Архитектурное проектирование"] },
      { "@type": "WebSite", "@id": siteUrl("/#website"), name: SITE_NAME, alternateName: "Роман Коськин — портфолио", url: siteUrl(), inLanguage: "ru-RU", publisher: { "@id": siteUrl("/#person") } },
      { "@type": "ProfilePage", "@id": siteUrl("/#profile"), name: `${AUTHOR} — портфолио дизайнера`, url: siteUrl(), inLanguage: "ru-RU", isPartOf: { "@id": siteUrl("/#website") }, mainEntity: { "@id": siteUrl("/#person") }, hasPart: projects.map(p => ({ "@type": "WebPage", name: p.name, url: siteUrl(`/projects/${p.slug}`) })) },
    ],
  };
}

export function projectStructuredData(p: ManagedProject) {
  const url = siteUrl(`/projects/${p.slug}`);
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebPage", "@id": `${url}#page`, url, name: p.name, description: p.description, inLanguage: "ru-RU", isPartOf: { "@type": "WebSite", name: SITE_NAME, url: siteUrl() }, about: { "@type": "Person", name: AUTHOR, url: siteUrl() } },
      { "@type": "BreadcrumbList", itemListElement: [{ "@type": "ListItem", position: 1, name: "Портфолио Романа Коськина", item: siteUrl() }, { "@type": "ListItem", position: 2, name: p.name, item: url }] },
    ],
  };
}
