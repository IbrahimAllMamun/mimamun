import type { Metadata } from "next";
import { SiteSettings } from "@/components/admin/screens/site-settings";

export const metadata: Metadata = { title: "Settings" };

export default function AdminSiteSettingsPage() {
  return <SiteSettings />;
}
