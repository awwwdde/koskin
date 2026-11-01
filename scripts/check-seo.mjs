import assert from "node:assert/strict";

const base = process.env.SEO_CHECK_BASE_URL || "http://127.0.0.1:8080";
const origin = new URL(process.env.SEO_SITE_URL || "https://romankoskin.art").origin;
const headers = { "User-Agent": "Googlebot" };
async function get(path, customHeaders = {}) {
  return fetch(new URL(path, base), { headers: { ...headers, ...customHeaders }, redirect: "manual", signal: AbortSignal.timeout(20000) });
}
function attrs(tag) {
  return Object.fromEntries([...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, value.replaceAll("&amp;", "&")]));
}
function meta(html, name) {
  return [...html.matchAll(/<meta\b[^>]*>/g)].map(m => attrs(m[0])).find(a => a.name === name || a.property === name)?.content;
}
function canonical(html) {
  return [...html.matchAll(/<link\b[^>]*>/g)].map(m => attrs(m[0])).find(a => a.rel === "canonical")?.href;
}
function jsonld(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m => JSON.parse(m[1]));
}

const home = await get("/");
assert.equal(home.status, 200);
const html = await home.text();
assert.equal(canonical(html), origin);
assert.ok(html.includes("Роман Коськин"));
assert.equal(meta(html, "og:url"), origin);
assert.equal(meta(html, "twitter:card"), "summary_large_image");
assert.ok(meta(html, "description")?.length > 40);
assert.ok(!meta(html, "robots")?.includes("noindex"));
const graph = jsonld(html).flatMap(item => item["@graph"] || [item]);
for (const type of ["Person", "WebSite", "ProfilePage"]) assert.ok(graph.some(item => item["@type"] === type), type);
assert.ok(graph.find(item => item["@type"] === "Person").sameAs[0].startsWith("https://t.me/"));
const og = new URL(meta(html, "og:image"));
assert.equal(og.origin, origin);
const image = await get(og.pathname);
assert.equal(image.status, 200);
const png = Buffer.from(await image.arrayBuffer());
assert.equal(png.subarray(1, 4).toString(), "PNG");
assert.equal(png.readUInt32BE(16), 1200);
assert.equal(png.readUInt32BE(20), 630);
console.log("OK: homepage, Person/ProfilePage, canonical and 1200×630 social image");

const robotsResponse = await get("/robots.txt");
assert.equal(robotsResponse.status, 200);
const robots = await robotsResponse.text();
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.ok(robots.includes("Disallow: /admin"));
const sitemapResponse = await get("/sitemap.xml");
assert.equal(sitemapResponse.status, 200);
const sitemap = await sitemapResponse.text();
const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m => m[1]);
assert.ok(urls.includes(`${origin}/`));
assert.ok(urls.every(url => new URL(url).origin === origin && !/\/admin|\/api\/|\/privacy/.test(url)));
const contentResponse = await get("/api/content");
const { data } = await contentResponse.json();
assert.deepEqual(new Set(urls), new Set([`${origin}/`, ...data.projects.map(p => `${origin}/projects/${p.slug}`)]));
for (const project of data.projects) {
  const path = `/projects/${project.slug}`;
  const response = await get(path);
  assert.equal(response.status, 200, path);
  const page = await response.text();
  assert.equal(canonical(page), origin + path);
  assert.equal(meta(page, "og:url"), origin + path);
  assert.ok(jsonld(page).flatMap(item => item["@graph"] || [item]).some(item => item["@type"] === "BreadcrumbList"));
}
console.log(`OK: robots, sitemap and ${data.projects.length} published project pages`);

for (const path of ["/admin", "/privacy", "/healthz", "/api/admin/content"]) {
  const response = await get(path);
  assert.ok(response.headers.get("x-robots-tag")?.includes("noindex"), path);
  if (path === "/admin") assert.ok(meta(await response.text(), "robots").includes("noindex"));
}
assert.equal((await get("/projects/seo-check-nonexistent-project")).status, 404);
console.log("OK: private/utility pages excluded, missing project returns 404");

if (process.env.SEO_CHECK_REDIRECTS === "1") {
  for (const host of ["www.romankoskin.art", "seo-check.awwwdde.art"]) {
    const response = await get("/projects/architecture?utm_source=check", { Host: host, "X-Forwarded-Host": host });
    assert.equal(response.status, 308, host);
    assert.equal(response.headers.get("location"), `${origin}/projects/architecture?utm_source=check`);
  }
  const primary = await get("/", { Host: new URL(origin).host, "X-Forwarded-Host": new URL(origin).host, "X-Forwarded-Proto": "http" });
  assert.equal(primary.status, 200, "No TLS redirect loop behind Caddy");
  assert.equal((await get("/healthz", { Host: "seo-check.awwwdde.art", "X-Forwarded-Host": "seo-check.awwwdde.art" })).status, 200);
  console.log("OK: permanent canonical redirects, query preservation and proxy healthcheck");
}
console.log("SEO checks passed.");
