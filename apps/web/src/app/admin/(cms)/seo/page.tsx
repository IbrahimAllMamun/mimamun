import type { Metadata } from "next";
import { SeoSettings } from "@/components/admin/screens/site-settings";

export const metadata: Metadata = { title: "SEO" };

export default function AdminSeoSettingsPage() {
  return <SeoSettings />;
}
