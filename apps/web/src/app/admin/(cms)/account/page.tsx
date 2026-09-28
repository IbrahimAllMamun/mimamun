import type { Metadata } from "next";
import { AccountPage } from "@/components/admin/screens/people";

export const metadata: Metadata = { title: "Account" };

export default function AdminAccount() {
  return <AccountPage />;
}
