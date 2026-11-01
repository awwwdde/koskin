import type { MetadataRoute } from "next";
import { getContent } from "@/lib/server-content";
import { siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects } = await getContent();
  return [{ url: siteUrl(), changeFrequency: "monthly", priority: 1 }, ...projects.map(p => ({ url: siteUrl(`/projects/${p.slug}`), changeFrequency: "monthly" as const, priority: 0.7 }))];
}
