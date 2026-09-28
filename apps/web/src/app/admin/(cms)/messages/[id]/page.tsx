import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MessageDetail } from "@/components/admin/screens/messages";

export const metadata: Metadata = { title: "Message" };

export default async function AdminMessage({ params }: PageProps<"/admin/messages/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  return <MessageDetail id={id} />;
}
