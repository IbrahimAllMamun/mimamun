import type { Metadata } from "next";
import { Dashboard } from "@/components/admin/screens/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default function AdminHome() {
  return <Dashboard />;
}
