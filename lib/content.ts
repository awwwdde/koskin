import seed from "@/backend/default-content.json";
import type { Project } from "./projects";

export type ManagedProject = Project & { published: boolean; gallery: string[]; disclosure: string };
export type Settings = typeof seed.settings;
export type SiteContent = { settings: Settings; projects: ManagedProject[] };
export const defaultContent = seed as SiteContent;
