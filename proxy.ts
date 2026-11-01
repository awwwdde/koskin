import { NextResponse, type NextRequest } from "next/server";
import { siteOrigin } from "./lib/seo";

export function proxy(request: NextRequest) {
  // Enable only once the platform serves the custom domain with a valid certificate.
  // Never redirect on protocol alone: TLS terminates at the platform's Caddy proxy.
  const enabled = process.env.CANONICAL_REDIRECTS === "1" || (process.env.APP_ENV === "production" && process.env.CANONICAL_REDIRECTS !== "0");
  if (!enabled) return NextResponse.next();
  const origin = siteOrigin();
  const primary = new URL(origin).hostname.toLowerCase();
  const source = (request.headers.get("x-forwarded-host") || request.headers.get("host") || request.nextUrl.host).split(",")[0].trim().toLowerCase();
  let hostname: string;
  try { hostname = new URL(`http://${source}`).hostname; } catch { return NextResponse.next(); }
  if ([primary, "localhost", "127.0.0.1", "[::1]"].includes(hostname)) return NextResponse.next();
  if (!["GET", "HEAD"].includes(request.method)) return NextResponse.next();
  const target = new URL(origin);
  target.pathname = request.nextUrl.pathname;
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, 308);
}

export const config = { matcher: ["/", "/projects/:path*", "/privacy", "/admin/:path*", "/robots.txt", "/sitemap.xml"] };
