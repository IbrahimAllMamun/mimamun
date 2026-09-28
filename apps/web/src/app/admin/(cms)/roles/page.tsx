import type { Metadata } from "next";
import { RolesPage } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Roles" };

export default function AdminRoles() {
  return <RolesPage />;
}
