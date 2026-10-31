import type { MetadataRoute } from "next";
import { getContent } from "@/lib/server-content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { projects } = await getContent();
  const base = process.env.PUBLIC_SITE_URL || "http://localhost:3000";
  return [{ url: base, changeFrequency: "monthly", priority: 1 }, ...projects.map(p => ({ url: `${base}/projects/${p.slug}`, changeFrequency: "monthly" as const, priority: 0.7 }))];
}
