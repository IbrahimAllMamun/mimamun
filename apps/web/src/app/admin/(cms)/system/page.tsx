import type { Metadata } from "next";
import { SystemPage } from "@/components/admin/screens/operations";

export const metadata: Metadata = { title: "System" };

export default function AdminSystem() {
  return <SystemPage />;
}
