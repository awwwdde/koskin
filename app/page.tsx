import Portfolio from "@/components/portfolio";
import { getContent } from "@/lib/server-content";
import { pageMetadata, seoTitle } from "@/lib/seo";
import StructuredData from "@/components/structured-data";
import { homeStructuredData } from "@/lib/structured-data";

export async function generateMetadata() {
  const { settings } = await getContent();
  return pageMetadata({ title: seoTitle(settings), description: settings.seoDescription, path: "/" });
}
export default async function Home() {
  const content = await getContent();
  return <><StructuredData data={homeStructuredData(content)} /><Portfolio content={content} /></>;
}
