import type { Metadata } from "next";
import { MediaPage } from "@/components/admin/screens/media-page";

export const metadata: Metadata = { title: "Media" };

export default function AdminMedia() {
  return <MediaPage />;
}
