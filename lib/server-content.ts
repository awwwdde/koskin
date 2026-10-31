import "server-only";
import { cache } from "react";
import { defaultContent, type SiteContent } from "./content";

export const getContent = cache(async (): Promise<SiteContent> => {
  try {
    const response = await fetch("http://127.0.0.1:8100/api/content", { cache: "no-store", signal: AbortSignal.timeout(2500) });
    if (!response.ok) throw new Error("Content unavailable");
    return (await response.json()).data;
  } catch {
    // Static seed keeps the public portfolio available if the API is down.
    return defaultContent;
  }
});
