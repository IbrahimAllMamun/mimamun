import type { Metadata } from "next";
import { UsersPage } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Users" };

export default function AdminUsers() {
  return <UsersPage />;
}
