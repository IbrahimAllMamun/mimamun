import type { Metadata } from "next";
import { IntegrationsPage } from "@/components/admin/screens/operations";

export const metadata: Metadata = { title: "Integrations" };

export default function AdminIntegrations() {
  return <IntegrationsPage />;
}
