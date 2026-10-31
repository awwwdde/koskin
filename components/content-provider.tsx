"use client";
import { createContext, useContext } from "react";
import { defaultContent, type SiteContent } from "@/lib/content";
export const ContentContext = createContext<SiteContent>(defaultContent);
export const useSiteContent = () => useContext(ContentContext);
