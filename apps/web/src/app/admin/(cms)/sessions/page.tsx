import type { Metadata } from "next";
import { SessionsPage } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Sessions" };

export default function AdminSessions() {
  return <SessionsPage />;
}
