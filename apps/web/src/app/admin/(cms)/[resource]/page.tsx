import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findResource } from "@/components/admin/resources/registry";
import { ResourceListPage } from "@/components/admin/resources/resource-pages";

export async function generateMetadata({ params }: PageProps<"/admin/[resource]">): Promise<Metadata> {
  const { resource } = await params;
  return { title: findResource(resource)?.plural ?? "Not found" };
}

export default async function ResourceIndex({ params }: PageProps<"/admin/[resource]">) {
  const { resource } = await params;
  if (!findResource(resource)) notFound();
  return <ResourceListPage path={resource} />;
}
