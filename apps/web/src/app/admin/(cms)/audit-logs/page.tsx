import type { Metadata } from "next";
import { AuditLogPage } from "@/components/admin/screens/operations";

export const metadata: Metadata = { title: "Audit log" };

export default function AdminAuditLogs() {
  return <AuditLogPage />;
}
