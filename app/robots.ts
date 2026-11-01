import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";
export const dynamic = "force-dynamic";
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/", "/api/media/"], disallow: ["/api/", "/admin", "/healthz"] }, sitemap: siteUrl("/sitemap.xml") };
}
