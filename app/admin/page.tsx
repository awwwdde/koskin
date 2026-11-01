import type { Metadata } from "next";
import Admin from "@/components/admin/admin";
import "./admin.css";
export const metadata: Metadata = { title: "Панель управления", robots: { index: false, follow: false, googleBot: { index: false, follow: false } } };
export default function AdminPage() { return <Admin />; }
