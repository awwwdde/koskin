import Portfolio from "@/components/portfolio";
import { getContent } from "@/lib/server-content";

export default async function Home() { return <Portfolio content={await getContent()} />; }
