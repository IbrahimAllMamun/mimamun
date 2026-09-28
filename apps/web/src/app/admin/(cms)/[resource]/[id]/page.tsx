import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findResource } from "@/components/admin/resources/registry";
import { ResourceEditorPage } from "@/components/admin/resources/resource-pages";

const ID_PATTERN = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|new)$/i;

export async function generateMetadata({ params }: PageProps<"/admin/[resource]/[id]">): Promise<Metadata> {
  const { resource, id } = await params;
  const definition = findResource(resource);
  return { title: definition ? (id === "new" ? `New ${definition.label.toLowerCase()}` : `Edit ${definition.label.toLowerCase()}`) : "Not found" };
}

export default async function ResourceItem({ params }: PageProps<"/admin/[resource]/[id]">) {
  const { resource, id } = await params;
  if (!findResource(resource) || !ID_PATTERN.test(id)) notFound();
  return <ResourceEditorPage path={resource} id={id.toLowerCase()} />;
}
