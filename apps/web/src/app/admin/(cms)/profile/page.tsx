import type { Metadata } from "next";
import { ProfileSettings } from "@/components/admin/screens/site-settings";

export const metadata: Metadata = { title: "Profile" };

export default function AdminProfileSettingsPage() {
  return <ProfileSettings />;
}
