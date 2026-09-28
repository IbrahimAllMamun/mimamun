"use client";

import { Suspense } from "react";
import { LoadingRows } from "../page";
import { findResource } from "./registry";
import { ResourceEditor } from "./resource-editor";
import { ResourceList } from "./resource-list";

/** Client entry points: resource definitions contain functions, so they are looked up here, not passed from the server. */
export function ResourceListPage({ path }: { path: string }) {
  const resource = findResource(path);
  if (!resource) return null;
  return (
    <Suspense fallback={<LoadingRows />}>
      <ResourceList resource={resource} />
    </Suspense>
  );
}

export function ResourceEditorPage({ path, id }: { path: string; id: string }) {
  const resource = findResource(path);
  if (!resource) return null;
  return <ResourceEditor resource={resource} id={id} />;
}
