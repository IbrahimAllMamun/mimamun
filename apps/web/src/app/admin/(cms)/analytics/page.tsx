import type { Metadata } from "next";
import { AnalyticsPage } from "@/components/admin/screens/analytics";

export const metadata: Metadata = { title: "Analytics" };

export default function AdminAnalytics() {
  return <AnalyticsPage />;
}
