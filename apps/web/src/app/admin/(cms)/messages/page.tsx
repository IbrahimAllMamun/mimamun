import type { Metadata } from "next";
import { MessagesPage } from "@/components/admin/screens/messages";

export const metadata: Metadata = { title: "Messages" };

export default async function AdminMessages({ searchParams }: PageProps<"/admin/messages">) {
  const params = await searchParams;
  const status = typeof params.status === "string" ? params.status : "";
  return <MessagesPage initialStatus={status} />;
}
